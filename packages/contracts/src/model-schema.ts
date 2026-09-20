import { z } from 'zod';

// Small converter for the finite schema vocabulary used by world extensions.
// Runtime validation remains authoritative; unsupported schema types fail loudly.
export function modelSchema(schema:z.ZodTypeAny):Record<string,unknown> {
 if(schema instanceof z.ZodDiscriminatedUnion||schema instanceof z.ZodUnion)return {anyOf:schema.options.map((option:z.ZodTypeAny)=>modelSchema(option))};
 if(schema instanceof z.ZodOptional)return modelSchema(schema.unwrap());
 if(schema instanceof z.ZodObject) {
  const properties:Record<string,unknown>={},required:string[]=[];
  for(const [key,value] of Object.entries(schema.shape) as [string,z.ZodTypeAny][]) {
   properties[key]=modelSchema(value);if(!value.isOptional())required.push(key);
  }
  return {type:'object',additionalProperties:false,properties,required};
 }
 if(schema instanceof z.ZodRecord)return {type:'object',additionalProperties:modelSchema(schema.valueSchema)};
 if(schema instanceof z.ZodArray)return {type:'array',items:modelSchema(schema.element),...(schema._def.minLength?{minItems:schema._def.minLength.value}:{}),...(schema._def.maxLength?{maxItems:schema._def.maxLength.value}:{})};
 if(schema instanceof z.ZodEnum)return {type:'string',enum:schema.options};
 if(schema instanceof z.ZodLiteral)return {const:schema.value};
 if(schema instanceof z.ZodBoolean)return {type:'boolean'};
 if(schema instanceof z.ZodNumber)return {type:schema.isInt?'integer':'number',...(schema.minValue!==null?{minimum:schema.minValue}:{}),...(schema.maxValue!==null?{maximum:schema.maxValue}:{})};
 if(schema instanceof z.ZodString) {
  const result:Record<string,unknown>={type:'string'};
  for(const check of schema._def.checks) {
   if(check.kind==='min')result.minLength=check.value;
   if(check.kind==='max')result.maxLength=check.value;
   if(check.kind==='regex')result.pattern=check.regex.source;
  }
  return result;
 }
 throw Error('Unsupported extension schema for model response');
}
