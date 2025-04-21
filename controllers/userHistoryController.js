const UserHistory = require('../models/UserHistory');
const Song = require('../models/Song');

// Lưu lịch sử nghe nhạc khi user play một bài hát
exports.saveSongPlay = async (req, res) => {
    try {
        const { songId } = req.body;
        if (!songId) {
            return res.status(400).json({ message: 'songId is required' });
        }
        const userId = req.user.id;
        let userHistory = await UserHistory.findOne({ user: userId });
        if (!userHistory) {
            // Nếu user chưa có lịch sử, tạo mới
            userHistory = new UserHistory({
                user: userId,
                history: [{ song: songId, count: 1, lastPlayedAt: new Date() }]
            });
        } else {
            // Đã có, kiểm tra đã nghe bài này chưa
            const songEntry = userHistory.history.find(h => h.song.toString() === songId);
            if (songEntry) {
                songEntry.count += 1;
                songEntry.lastPlayedAt = new Date();
            } else {
                userHistory.history.push({ song: songId, count: 1, lastPlayedAt: new Date() });
            }
        }
        await userHistory.save();
        res.status(201).json({ message: 'Song play saved' });
    } catch (error) {
        console.error('Error in saveSongPlay:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Đề xuất nhạc dựa trên thể loại user nghe nhiều nhất
exports.recommendSongs = async (req, res) => {
    try {
        const userId = req.user.id;
        // Lấy lịch sử nghe nhạc của user (1 document)
        const userHistory = await UserHistory.findOne({ user: userId });
        if (!userHistory || !userHistory.history.length) {
            return res.status(200).json([]); // Chưa nghe bài nào
        }
        // Lấy songIds đã nghe và count
        const songIdToCount = {};
        userHistory.history.forEach(h => {
            songIdToCount[h.song.toString()] = h.count;
        });
        const songIds = Object.keys(songIdToCount);
        // Lấy thông tin genres, artists, tags của các bài đã nghe
        const songs = await Song.find({ _id: { $in: songIds } }, 'genres artists tags');
        // Đếm tần suất genres, artists, tags (có trọng số theo count)
        const genreCount = {}, artistCount = {}, tagCount = {};
        songs.forEach((song, idx) => {
            const count = songIdToCount[song._id.toString()] || 1;
            // genres
            if (Array.isArray(song.genres)) {
                song.genres.forEach(g => {
                    genreCount[g] = (genreCount[g] || 0) + count;
                });
            }
            // artists
            if (Array.isArray(song.artists)) {
                song.artists.forEach(a => {
                    artistCount[a] = (artistCount[a] || 0) + count;
                });
            }
            // tags
            if (Array.isArray(song.tags)) {
                song.tags.forEach(t => {
                    tagCount[t] = (tagCount[t] || 0) + count;
                });
            }
        });
        // Lấy top genres, artists, tags user nghe nhiều nhất
        const topGenres = Object.entries(genreCount).sort((a,b)=>b[1]-a[1]).map(([g])=>g).slice(0,2);
        const topArtists = Object.entries(artistCount).sort((a,b)=>b[1]-a[1]).map(([a])=>a).slice(0,2);
        const topTags = Object.entries(tagCount).sort((a,b)=>b[1]-a[1]).map(([t])=>t).slice(0,2);
        // Đề xuất các bài hát liên quan, loại trừ các bài đã nghe
        // Đề xuất theo sở thích
        let recommended = await Song.find({
            $and: [
                { status: 'public' },
                { _id: { $nin: songIds } },
                {
                    $or: [
                        { genres: { $in: topGenres } },
                        { artists: { $in: topArtists } },
                        { tags: { $in: topTags } }
                    ]
                }
            ]
        }).limit(20);
        // Nếu chưa đủ, bổ sung random các bài hát public khác chưa nghe
        let explore = [];
        if (recommended.length < 20) {
            explore = await Song.aggregate([
                { $match: { status: 'public', _id: { $nin: songIds.concat(recommended.map(s => s._id)) } } },
                { $sample: { size: 20 - recommended.length } }
            ]);
        }
        // Gắn nhãn cho từng nhóm
        const recommendedWithLabel = recommended.map(song => ({ ...song.toObject(), recommendType: 'recommended' }));
        const exploreWithLabel = explore.map(song => ({ ...song, recommendType: 'explore' }));
        res.status(200).json({
            recommended: recommendedWithLabel,
            explore: exploreWithLabel
        });
    } catch (error) {
        console.error('Error in recommendSongs:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
