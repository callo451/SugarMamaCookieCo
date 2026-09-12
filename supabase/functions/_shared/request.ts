export class RequestError extends Error {
 constructor(message:string,public status:number){super(message);}
}
/** Bound bytes while streaming, before decoding/parsing untrusted input. */
export async function readJson(req:Request,maximum=12000):Promise<Record<string,unknown>> {
 const reader=req.body?.getReader();if(!reader)throw new RequestError('JSON object required',400);
 let size=0;const chunks:Uint8Array[]=[];
 try {
  while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>maximum){await reader.cancel();throw new RequestError('Request too large',413);}chunks.push(value);}
 }finally{reader.releaseLock();}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
 let body;try{body=JSON.parse(new TextDecoder().decode(bytes));}catch{throw new RequestError('Invalid JSON',400);}
 if(!body||Array.isArray(body)||typeof body!=='object')throw new RequestError('JSON object required',400);
 return body;
}
