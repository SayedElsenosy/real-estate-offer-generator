// Read only worksheet values, using the runtime's native ZIP decompression.
// ExcelJS also builds styles, drawings and workbook objects, which exceeds the
// Workers Free CPU budget. No formula evaluation or external XML entities.
const LIMIT = 20 * 1024 * 1024;
const decoder = new TextDecoder();
function xmlText(value: string): string {
  return value.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, entity: string) => {
    const named: Record<string,string> = {amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"};
    if (entity[0] !== '#') return named[entity];
    const n = entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2),16) : Number(entity.slice(1));
    return n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : '';
  });
}
function attrs(tag: string) {
  const result: Record<string,string> = {};
  for (const m of tag.matchAll(/([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) result[m[1]] = xmlText(m[2] ?? m[3]);
  return result;
}
function texts(xml: string) {
  return [...xml.matchAll(/<(?:\w+:)?t(?:\s[^>]*)?>([\s\S]*?)<\/(?:\w+:)?t>/g)].map(m=>xmlText(m[1])).join('');
}
export async function readXlsxRows(bytes: Uint8Array, tab: string): Promise<string[][]> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = bytes.length - 22;
  for (; end >= Math.max(0,bytes.length-65557); end--) if(view.getUint32(end,true)===0x06054b50) break;
  if(end<0 || view.getUint32(end,true)!==0x06054b50) throw Error('Invalid XLSX ZIP directory');
  const files = new Map<string,{method:number;size:number;packed:number;offset:number}>();
  let at=view.getUint32(end+16,true);
  const count=view.getUint16(end+10,true);
  if(count>10000)throw Error('XLSX contains too many ZIP entries');
  for(let i=0;i<count;i++){
    if(at+46>bytes.length || view.getUint32(at,true)!==0x02014b50)throw Error('Invalid XLSX ZIP entry');
    if(view.getUint16(at+8,true)&1)throw Error('Encrypted XLSX is not supported');
    const n=view.getUint16(at+28,true),extra=view.getUint16(at+30,true),comment=view.getUint16(at+32,true);
    const name=decoder.decode(bytes.subarray(at+46,at+46+n));
    if(files.has(name))throw Error('Ambiguous XLSX ZIP entry');
    files.set(name,{method:view.getUint16(at+10,true),packed:view.getUint32(at+20,true),size:view.getUint32(at+24,true),offset:view.getUint32(at+42,true)});
    at+=46+n+extra+comment;
  }
  async function read(name:string, optional=false):Promise<string>{
    const entry=files.get(name);
    if(!entry){if(optional)return '';throw Error('Missing XLSX part: '+name);}
    if(entry.size>LIMIT || entry.offset+30>bytes.length)throw Error('XLSX part exceeds supported limits');
    const o=entry.offset;
    if(view.getUint32(o,true)!==0x04034b50)throw Error('Invalid XLSX local ZIP entry');
    const start=o+30+view.getUint16(o+26,true)+view.getUint16(o+28,true);
    if(start+entry.packed>bytes.length)throw Error('Truncated XLSX part');
    const packed=bytes.slice(start,start+entry.packed);
    if(entry.method===0){if(packed.length!==entry.size)throw Error('Invalid XLSX size');return decoder.decode(packed);}
    if(entry.method!==8)throw Error('Unsupported XLSX compression');
    const stream=new Blob([packed]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    const reader=stream.getReader();const chunks:Uint8Array[]=[];let length=0;
    while(true){const {value,done}=await reader.read();if(done)break;length+=value.length;
      if(length>LIMIT || length>entry.size){await reader.cancel();throw Error('XLSX expanded size exceeds limit');}chunks.push(value);}
    if(length!==entry.size)throw Error('Invalid XLSX expanded size');
    const result=new Uint8Array(length);let offset=0;for(const c of chunks){result.set(c,offset);offset+=c.length;}
    return decoder.decode(result);
  }
  const workbook=await read('xl/workbook.xml');
  const sheets=[...workbook.matchAll(/<(?:\w+:)?sheet\s[^>]*\/?>/g)].map(m=>attrs(m[0])).filter(s=>s.name===tab);
  if(sheets.length!==1)throw Error('The Excel workbook does not contain a unique configured tab: '+tab);
  const rels=await read('xl/_rels/workbook.xml.rels');
  const rel=[...rels.matchAll(/<(?:\w+:)?Relationship\s[^>]*\/?>/g)].map(m=>attrs(m[0])).find(r=>r.Id===sheets[0]['r:id']);
  if(!rel || rel.TargetMode==='External')throw Error('Unsupported XLSX worksheet relationship');
  const path=rel.Target.startsWith('/')?rel.Target.slice(1):'xl/'+rel.Target;
  if(path.includes('..')||!path.startsWith('xl/'))throw Error('Invalid XLSX worksheet path');
  const sharedXml=await read('xl/sharedStrings.xml',true);
  const shared=[...sharedXml.matchAll(/<(?:\w+:)?si(?:\s[^>]*)?>([\s\S]*?)<\/(?:\w+:)?si>/g)].map(m=>texts(m[1]));
  const sheet=await read(path);
  const rows:string[][]=[];
  for(const match of sheet.matchAll(/<(?:\w+:)?row\b[^>]*>([\s\S]*?)<\/(?:\w+:)?row>/g)){
    const row:string[]=[];
    for(const cell of match[1].matchAll(/<(?:\w+:)?c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/(?:\w+:)?c>)/g)){
      const a=attrs(cell[1]),ref=/^([A-Z]+)(\d+)$/.exec(a.r||'');if(!ref)throw Error('Missing XLSX cell reference');
      let col=0;for(const letter of ref[1])col=col*26+letter.charCodeAt(0)-64;
      if(col>16384)throw Error('Invalid XLSX column');
      const inner=cell[2]||'',v=/<(?:\w+:)?v(?:\s[^>]*)?>([\s\S]*?)<\/(?:\w+:)?v>/.exec(inner)?.[1]??'';
      if(a.t==='s' && (!/^\d+$/.test(v)||Number(v)>=shared.length))throw Error('Invalid XLSX shared string');
      row[col-1]=(a.t==='s'?shared[Number(v)]:a.t==='inlineStr'?texts(inner):a.t==='e'?'':xmlText(v)).trim();
    }
    const number=Number(attrs(match[0].slice(0,match[0].indexOf('>')+1)).r);
    if(number===1)rows.unshift(row);else rows.push(row);
  }
  return rows;
}
