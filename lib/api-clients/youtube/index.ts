import * as urllib from 'url';
import * as https from 'https';

const { create: createYoutubeDl } = require('youtube-dl-exec');
const youtubeDl = createYoutubeDl('yt-dlp');

export async function getYtAudio(url: string) {
  try {
    const output = await youtubeDl(url, {
      format: 'bestaudio/best',
      dumpSingleJson: true,
      noCheckCertificates: true,
      noWarnings: true,
      extractAudio: true,
      addHeader: ['referer:youtube.com', 'user-agent:googlebot'],
    });
    return output;
  } catch (error) {
    throw error;
  }
}

export async function findYtVideo(searchStr: string): Promise<string> {
  /**
   * Find a youtube video with a search string. Returns
   * the first search result.
   * searchStr - keywords separated by space
   */
  const url = `https://www.youtube.com/results?search_query=${searchStr.replace(' ', '+')}`;
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let html = '';
        res.on('data', (chunk) => {
          html += chunk;
        });
        res.on('end', () => {
          const videoIds = html.match(/watch\?v=(\S{11})/g);
          if (videoIds) {
            resolve(`https://www.youtube.com/${videoIds[0]}`);
          } else {
            reject(new Error('No video found'));
          }
        });
      })
      .on('error', (err) => {
        reject(err);
      });
  });
}
