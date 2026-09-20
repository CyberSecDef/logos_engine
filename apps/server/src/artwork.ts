import {inflateSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {ArtworkImportSchema} from '../../../packages/contracts/src/artwork.js';
export const MAX_ARTWORK_BYTES=32*1024*1024;
const crcTable=Array.from({length:256},(_,n)=>{for(let i=0;i<8;i++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
function crc(data:Buffer){let n=0xffffffff;for(const byte of data)n=crcTable[(n^byte)&255]^(n>>>8);return (n^0xffffffff)>>>0;}
export function pngInfo(data:Buffer){
 if(data.length<45||data.length>8*1024*1024||!data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))throw Error('Artwork must be a PNG under 8 MiB');
 if(data.readUInt32BE(8)!==13||data.toString('ascii',12,16)!=='IHDR')throw Error('Invalid PNG header');
 const width=data.readUInt32BE(16),height=data.readUInt32BE(20);
 if(width<1||height<1||width>2048||height>2048)throw Error('Artwork dimensions must be 1–2048 pixels');
 const channels=({0:1,2:3,3:1,4:2,6:4} as Record<number,number>)[data[25]];
 if(data[24]!==8||!channels||data[26]!==0||data[27]!==0||data[28]!==0)throw Error('Use a non-interlaced, 8-bit PNG');
 let offset=8,hasData=false,ended=false,headers=0,palette=false;const chunks:Buffer[]=[];
 while(offset<data.length){if(offset+12>data.length)throw Error('Truncated PNG');const length=data.readUInt32BE(offset),type=data.toString('ascii',offset+4,offset+8);if(length>data.length-offset-12)throw Error('Truncated PNG chunk');if(crc(data.subarray(offset+4,offset+8+length))!==data.readUInt32BE(offset+8+length))throw Error('PNG checksum failed');if(type==='IHDR')headers++;if(type==='PLTE')palette=true;if(type==='IDAT')chunks.push(data.subarray(offset+8,offset+8+length));if(type==='acTL')throw Error('Animated PNG artwork is unsupported');if(type==='IDAT')hasData=true;offset+=length+12;if(type==='IEND'){if(length!==0||offset!==data.length)throw Error('Invalid PNG ending');ended=true;break;}}
 if(!hasData||!ended||headers!==1||data[25]===3&&!palette)throw Error('Incomplete PNG');
 const stride=width*channels+1,expected=stride*height,decoded=inflateSync(Buffer.concat(chunks),{maxOutputLength:expected});
 if(decoded.length!==expected)throw Error('PNG decoded size mismatch');for(let i=0;i<height;i++)if(decoded[i*stride]>4)throw Error('Invalid PNG filter');
 return {width,height,bytes:data.length,hash:createHash('sha256').update(data).digest('hex')};
}
export function parseArtwork(input:unknown){
 if(Buffer.byteLength(JSON.stringify(input))>MAX_ARTWORK_BYTES)throw Error('Artwork pack exceeds 32 MiB');
 const bundle=ArtworkImportSchema.parse(input),slots=new Set(bundle.pack.images.map(i=>i.slot)),references=new Set(bundle.pack.images.map(i=>i.hash));
 if(slots.size!==bundle.pack.images.length)throw Error('Duplicate artwork slot');
 const images=bundle.images.map(image=>{const data=Buffer.from(image.data,'base64');if(data.toString('base64')!==image.data)throw Error('Invalid image encoding');const info=pngInfo(data);if(info.hash!==image.hash)throw Error('Artwork image integrity check failed');return {...info,data};});
 if(new Set(images.map(i=>i.hash)).size!==images.length||images.length!==references.size||images.some(i=>!references.has(i.hash)))throw Error('Artwork images must match manifest references exactly');
 return {pack:bundle.pack,images};
}
