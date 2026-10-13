export type AssessmentMode = 'off'|'gemini';
export interface AudioAssessment {
 provider:'gemini'|'local-check'; model:string; transcript:string; usable:boolean;
 confidence:'low'|'medium'|'high'; errorCount:number|null;
 scoreSuggestions:{volume:number|null;punctuation:number|null;clarity:number|null};
 evidence:Record<string,string>; measurements?:Record<string,number>; limits:string[];
}
export function validateAssessment(value:any):AudioAssessment {
 if(!value||!['gemini','local-check'].includes(value.provider)||typeof value.transcript!=='string'||typeof value.usable!=='boolean'||!['low','medium','high'].includes(value.confidence))throw new Error('Kết quả AI không đúng định dạng.');
 const scoreSuggestions:any={};
 for(const key of ['volume','punctuation','clarity']){
  const n=value.scoreSuggestions?.[key];if(n!==null&&n!==0&&n!==0.25)throw new Error('Điểm AI nằm ngoài thang điểm.');scoreSuggestions[key]=n;
 }
 const count=value.errorCount;if(count!==null&&(!Number.isInteger(count)||count<0))throw new Error('Số lỗi AI không hợp lệ.');
 const evidence:Record<string,string>={};for(const[key,v]of Object.entries(value.evidence||{}))if(typeof v==='string')evidence[key]=v.slice(0,1200);
 return {provider:value.provider,model:String(value.model||''),transcript:value.transcript.slice(0,30000),usable:value.usable&&!!value.transcript.trim(),confidence:value.confidence,errorCount:count,scoreSuggestions,evidence,measurements:value.measurements,limits:Array.isArray(value.limits)?value.limits.filter((v:any)=>typeof v==='string'):[]};
}
export async function teacherSession(){
 const url=new URL(location.href),invite=url.searchParams.get('teacher');
 if(!invite)return;
 url.searchParams.delete('teacher');history.replaceState(null,'',url.pathname+url.search+url.hash);
 const response=await fetch('/api/teacher-session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({invite}),signal:AbortSignal.timeout(7000)});
 if(!response.ok)throw new Error('Liên kết giáo viên không hợp lệ hoặc máy chủ chưa cấu hình.');
}
export async function assessmentStatus(_mode:AssessmentMode){
 const response=await fetch('/api/assessment-status',{signal:AbortSignal.timeout(15000)});if(!response.ok)throw new Error('Không kết nối được máy chủ chấm giọng.');return response.json();
}
export async function assessAudio(mode:AssessmentMode,blob:Blob,passage:string,duration:number,consent:boolean):Promise<AudioAssessment>{
 if(mode==='off')throw new Error('Chưa chọn chế độ chấm giọng.');
 if(mode==='gemini'&&!consent)throw new Error('Chưa đồng ý gửi bản ghi tới Gemini.');
 if(!blob.size||blob.size>10*1024*1024)throw new Error('Bản ghi rỗng hoặc vượt 10 MB.');
 const context=new AudioContext();
 let peak=0,sum=0,count=0;
 try{
  const buffer=await context.decodeAudioData(await blob.arrayBuffer());
  for(let channel=0;channel<buffer.numberOfChannels;channel++)for(const sample of buffer.getChannelData(channel)){peak=Math.max(peak,Math.abs(sample));sum+=sample*sample;count++;}
 }finally{await context.close();}
 const rms=Math.sqrt(sum/Math.max(1,count));
 if(peak<=0.00001&&rms<=0.000001)return {provider:'local-check',model:'Không gửi âm thanh lên Gemini',transcript:'',usable:false,confidence:'low',errorCount:null,scoreSuggestions:{volume:null,punctuation:null,clarity:null},evidence:{volume:'Bản ghi im lặng hoặc tín hiệu quá nhỏ để nhận dạng.'},measurements:{rms,peak},limits:['Kiểm tra tín hiệu trong trình duyệt; chưa gọi AI và không tự chấm. Hãy kiểm tra micro rồi đọc lại.']};
 const audio=await new Promise<string>((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result).split(',')[1]);r.onerror=()=>reject(new Error('Không đọc được bản ghi.'));r.readAsDataURL(blob);});
 const response=await fetch('/api/assess-reading',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({provider:mode,audio,mimeType:blob.type.split(';')[0]||'audio/webm',passage,duration,consent}),signal:AbortSignal.timeout(120000)});
 let result:any;try{result=await response.json();}catch{throw new Error('Máy chủ chưa hỗ trợ chấm giọng hoặc đang khởi động.');}if(!response.ok)throw new Error(result.error||'Không phân tích được bản ghi.');return validateAssessment(result);
}
