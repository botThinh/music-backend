const Song = require('../models/Song');
const Artist = require('../models/Artist');

class SearchService {
    // Tìm kiếm theo tên bài hát
    async searchByTitle(query, limit = 10) {
        try {
            const searchRegex = new RegExp(query, 'i');
            const songs = await Song.find({
                title: searchRegex,
                status: 'public'
            })
                .sort({ playCount: -1 })
                .limit(limit);

            return songs;
        } catch (error) {
            console.error('Error in title search:', error);
            throw error;
        }
    }

    // Tìm kiếm theo tên nghệ sĩ
    async searchByArtist(query, limit = 10) {
        try {
            const searchRegex = new RegExp(query, 'i');
            const artists = await Artist.find({
                name: searchRegex
            })
                .limit(limit);

            return artists;
        } catch (error) {
            console.error('Error in artist search:', error);
            throw error;
        }
    }

    // Tìm kiếm trong lyrics
    async searchByLyrics(query, limit = 10) {
        try {
            const searchRegex = new RegExp(query, 'i');
            const songs = await Song.find({
                lyrics: searchRegex,
                status: 'public'
            })
                .select('title artist lyrics') // Chỉ lấy các trường cần thiết
                .limit(limit);

            // Xử lý kết quả để hiển thị đoạn lyrics chứa từ khóa
            const processedSongs = songs.map(song => {
                const lyrics = song.lyrics;
                const index = lyrics.toLowerCase().indexOf(query.toLowerCase());
                const start = Math.max(0, index - 50);
                const end = Math.min(lyrics.length, index + query.length + 50);
                const excerpt = lyrics.substring(start, end);

                return {
                    ...song.toObject(),
                    lyricsExcerpt: excerpt,
                    matchPosition: index
                };
            });

            return processedSongs;
        } catch (error) {
            console.error('Error in lyrics search:', error);
            throw error;
        }
    }

    // Tìm kiếm theo genre
    async searchByGenre(genre, limit = 10) {
        try {
            const searchRegex = new RegExp(genre, 'i');
            const songs = await Song.find({
                genres: searchRegex,
                status: 'public'
            })
                .sort({ playCount: -1 })
                .limit(limit);

            return songs;
        } catch (error) {
            console.error('Error in genre search:', error);
            throw error;
        }
    }
}

module.exports = new SearchService(); 