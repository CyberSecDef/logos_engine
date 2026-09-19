import { systemPrompt, type ModelProvider, type PromptContext } from './context.js';
// One model request per user action. No agent tools, retries, or automatic repair.
export class AnthropicProvider implements ModelProvider {
 readonly name='Anthropic API';
 constructor(private readonly apiKey:string,private readonly model:string,private readonly fetcher:typeof fetch=fetch) {}
 async generate(context:PromptContext,signal:AbortSignal):Promise<unknown> {
  const response=await this.fetcher('https://api.anthropic.com/v1/messages',{
   method:'POST',signal,headers:{'content-type':'application/json','x-api-key':this.apiKey,'anthropic-version':'2023-06-01'},
   body:JSON.stringify({model:this.model,max_tokens:2500,system:systemPrompt,messages:[{role:'user',content:JSON.stringify(context)}]}),
  });
  if(!response.ok)throw Error(`Anthropic API returned HTTP ${response.status}. Check credentials, model access, and usage limits.`);
  const reader=response.body?.getReader();if(!reader)throw Error('Empty provider response');
  let body='';const decoder=new TextDecoder();
  while(true){const {value,done}=await reader.read();if(done)break;body+=decoder.decode(value,{stream:true});if(body.length>128000){await reader.cancel();throw Error('Provider response exceeded size limit');}}
  body+=decoder.decode();const data=JSON.parse(body);
  if(data.stop_reason==='max_tokens')throw Error('Model response was truncated. Try a shorter request.');
  const text=data.content?.filter((c:{type:string})=>c.type==='text').map((c:{text:string})=>c.text).join('');
  if(typeof text!=='string')throw Error('No model response');
  return JSON.parse(text);
 }
}
