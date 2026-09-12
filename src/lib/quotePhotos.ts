export type QuotePhoto={id:string;file:File;preview:string;name:string};
export const MAX_QUOTE_PHOTOS=3;
export async function prepareQuotePhoto(file:File):Promise<QuotePhoto>{
 if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw Error('Please choose a JPG, PNG or WebP image. Convert HEIC photos to JPG first.');
 if(file.size>10*1024*1024)throw Error('Please choose images smaller than 10 MB each.');
 const bitmap=await createImageBitmap(file).catch(()=>{throw Error(`Could not open ${file.name}. Please choose another image.`);});
 try{
  const scale=Math.min(1,1600/Math.max(bitmap.width,bitmap.height));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
  const ctx=canvas.getContext('2d');if(!ctx)throw Error('Image processing is unavailable in this browser.');ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
  const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('Could not prepare this image.')),'image/jpeg',.82));
  if(blob.size>2*1024*1024)throw Error('This image is still too large. Please choose a smaller version.');
  const prepared=new File([blob],file.name.replace(/\.[^.]+$/,'')+'.jpg',{type:'image/jpeg'});
  return {id:crypto.randomUUID(),file:prepared,preview:URL.createObjectURL(blob),name:file.name};
 }finally{bitmap.close();}
}
