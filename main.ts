import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const rootIn=process.env.MAKEFUN_INPUT_DIR||'/input',rootOut=process.env.MAKEFUN_OUTPUT_DIR||'/output';
const meta=Array(84);
const def=(op,im=0,pop=0,push=0)=>meta[op]=[im,pop,push];
def(0);
def(1,1,0,1);def(2,4,0,1);def(3,0,1);def(4,0,1,2);def(5,0,2,2);def(6,0,2,3);def(7,0,3,3);
for(let op=16;op<=30;op++)def(op,0,2,1);
def(23,0,1,1);def(27,0,1,1);
def(32,0,2,1);def(33,0,2,1);def(34,0,2,1);
def(48,2);def(49,2,1);def(50,2,1);def(51,2);def(52,0,0,1);def(53,0,1);
def(64,0,1,1);def(65,0,2);def(80,0,1);def(81,0,1);def(82,0,0,1);def(83,0,1);
function execute(code,src){
 let pc=0,steps=0,ip=0,sp=0,cp=0,exit=0;const d=new Int32Array(256),calls=new Int32Array(64),mem=new Int32Array(256),out=[];
 const trap=n=>{exit=n;return true};
 for(;;){
  if(steps===1e6){trap(10);break} if(pc<0||pc>=code.length){trap(9);break}
  const op=code[pc],m=meta[op];if(!m||op===31){trap(5);break}const [im,pop,push]=m,next=pc+1+im;
  if(next>code.length){trap(9);break}steps++;
  if(sp<pop){trap(2);break}if(sp-pop+push>256){trap(3);break}pc=next;
  let a,b,r,addr;
  switch(op){
   case 0:exit=0;return [out,exit];
   case 1:d[sp++]=(code[next-1]<<24)>>24;break;
   case 2:d[sp++]=code[next-4]|code[next-3]<<8|code[next-2]<<16|code[next-1]<<24;break;
   case 3:sp--;break;case 4:d[sp]=d[sp-1];sp++;break;
   case 5:a=d[sp-1];d[sp-1]=d[sp-2];d[sp-2]=a;break;
   case 6:d[sp++]=d[sp-2];break;
   case 7:a=d[sp-3];d[sp-3]=d[sp-2];d[sp-2]=d[sp-1];d[sp-1]=a;break;
   case 16:case 17:case 18:case 19:case 20:case 21:case 22:case 24:case 25:case 26:case 28:case 29:case 30:case 32:case 33:case 34:
    b=d[--sp];a=d[sp-1];
    if(op===16)r=a+b;else if(op===17)r=a-b;else if(op===18)r=Math.imul(a,b);
    else if(op===19||op===20){if(!b){trap(4);return [out,exit]}r=op===19?(a===-2147483648&&b===-1?a:Math.trunc(a/b)):(b===-1?0:a%b)}
    else if(op===21||op===22){if(!b){trap(4);return [out,exit]}r=op===21?Math.floor((a>>>0)/(b>>>0)):((a>>>0)%(b>>>0))}
    else if(op===24)r=a&b;else if(op===25)r=a|b;else if(op===26)r=a^b;
    else if(op===28)r=a<<(b&31);else if(op===29)r=a>>(b&31);else if(op===30)r=a>>>(b&31);
    else if(op===32)r=+(a===b);else if(op===33)r=+(a<b);else r=+((a>>>0)<(b>>>0));
    d[sp-1]=r|0;break;
   case 23:d[sp-1]=-d[sp-1]|0;break;case 27:d[sp-1]=~d[sp-1];break;
   case 48:case 49:case 50:{const off=(code[next-2]|code[next-1]<<8);const rel=(off<<16)>>16;let take=true;if(op!==48){const v=d[--sp];take=op===49?v===0:v!==0}if(take)pc=next+rel;break}
   case 51:if(cp===64){trap(7);return [out,exit]}calls[cp++]=next;pc=code[next-2]|code[next-1]<<8;break;
   case 52:if(!cp){trap(8);return [out,exit]}pc=calls[--cp];break;
   case 64:addr=d[sp-1];if(addr<0||addr>255){trap(6);return [out,exit]}d[sp-1]=mem[addr];break;
   case 65:addr=d[sp-1];if(addr<0||addr>255){trap(6);return [out,exit]}mem[addr]=d[sp-2];sp-=2;break;
   case 80:{const bytes=Buffer.from(String(d[sp-1]));if(out.length+bytes.length>65536){trap(11);return [out,exit]}sp--;for(const x of bytes)out.push(x);break}
   case 81:if(out.length===65536){trap(11);return [out,exit]}out.push(d[--sp]&255);break;
   case 82:d[sp++]=ip<src.length?src[ip++]:-1;break;
   case 83:exit=d[--sp]&255;return [out,exit];
  }
 }
 return [out,exit];
}
for(const id of readdirSync(rootIn).sort()){
 const dir=join(rootIn,id),code=readFileSync(join(dir,'program.bin')),input=readFileSync(join(dir,'input.bin')),[bytes,status]=execute(code,input),dest=join(rootOut,id);
 mkdirSync(dest,{recursive:true});writeFileSync(join(dest,'stdout.bin'),Buffer.from(bytes));writeFileSync(join(dest,'exit.txt'),String(status)+'\n');
}
