/**
 * Tiện ích đọc và trích xuất văn bản từ TXT, DOCX, PDF và Ảnh
 * Tích hợp nhận dạng ký tự quang học (OCR) thực tế bằng Tesseract.js chạy trên trình duyệt.
 * Luôn trả về kết quả để giáo viên duyệt và chỉnh sửa trước khi lưu.
 */

import Tesseract from 'tesseract.js';

// Đọc tệp TXT thuần với mã hóa UTF-8
export async function readTxtFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const text = (reader.result as string) || '';
      resolve(text.trim());
    };
    reader.onerror = () => reject(new Error('Không thể đọc tệp văn bản TXT.'));
    reader.readAsText(file, 'utf-8');
  });
}

// DOCX là ZIP: đọc central directory, giải nén word/document.xml trước khi đọc XML.
// Không bao giờ trả thông báo lỗi làm nội dung bài đọc.
export async function extractDocxXml(arrayBuffer: ArrayBuffer): Promise<string> {
  if (arrayBuffer.byteLength > 50 * 1024 * 1024) throw new Error('Tệp Word vượt giới hạn 50 MB.');
  const view = new DataView(arrayBuffer);
  const bytes = new Uint8Array(arrayBuffer);
  let eocd = -1;
  for (let i=bytes.length-22; i>=Math.max(0,bytes.length-65557); i--) {
    if(view.getUint32(i,true)===0x06054b50 && i+22+view.getUint16(i+20,true)===bytes.length) { eocd=i; break; }
  }
  if(eocd<0) throw new Error('Tệp không phải DOCX/ZIP hợp lệ hoặc bị hỏng.');
  if(view.getUint16(eocd+4,true)!==0 || view.getUint16(eocd+6,true)!==0) throw new Error('Không hỗ trợ ZIP nhiều phần.');
  const count=view.getUint16(eocd+10,true);
  let cursor=view.getUint32(eocd+16,true);
  if(count===65535 || cursor===0xffffffff) throw new Error('Không hỗ trợ ZIP64. Vui lòng lưu lại DOCX thông thường.');
  for(let i=0;i<count;i++) {
    if(cursor+46>bytes.length || view.getUint32(cursor,true)!==0x02014b50) throw new Error('Danh mục DOCX bị hỏng.');
    const flags=view.getUint16(cursor+8,true), method=view.getUint16(cursor+10,true);
    const crc=view.getUint32(cursor+16,true), compressed=view.getUint32(cursor+20,true), size=view.getUint32(cursor+24,true);
    const nameLength=view.getUint16(cursor+28,true), extraLength=view.getUint16(cursor+30,true), commentLength=view.getUint16(cursor+32,true);
    const offset=view.getUint32(cursor+42,true);
    const next=cursor+46+nameLength+extraLength+commentLength;
    if(next>bytes.length) throw new Error('Danh mục DOCX bị cắt ngắn.');
    const name=new TextDecoder('utf-8').decode(bytes.subarray(cursor+46,cursor+46+nameLength));
    cursor=next;
    if(name!=='word/document.xml') continue;
    if(flags&1) throw new Error('Tệp Word được mã hóa. Vui lòng dùng bản không đặt mật khẩu.');
    if(size>16*1024*1024) throw new Error('Nội dung Word quá lớn.');
    if(offset+30>bytes.length || view.getUint32(offset,true)!==0x04034b50) throw new Error('Nội dung DOCX bị hỏng.');
    const dataStart=offset+30+view.getUint16(offset+26,true)+view.getUint16(offset+28,true);
    if(dataStart+compressed>bytes.length) throw new Error('Nội dung DOCX bị cắt ngắn.');
    let output;
    const data=bytes.slice(dataStart,dataStart+compressed);
    if(method===0) output=data;
    else if(method===8) {
      try {
        const stream=new Blob([data.buffer]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
        output=new Uint8Array(await new Response(stream).arrayBuffer());
      } catch { throw new Error('Không giải nén được DOCX. Hãy dùng Chrome cập nhật và tệp Word còn nguyên vẹn.'); }
    } else throw new Error('Kiểu nén DOCX không được hỗ trợ.');
    if(output.length!==size) throw new Error('Kích thước dữ liệu Word không hợp lệ.');
    let check=0xffffffff;
    for(const byte of output) { check^=byte; for(let b=0;b<8;b++) check=(check>>>1)^((check&1)?0xedb88320:0); }
    if(((check^0xffffffff)>>>0)!==crc) throw new Error('Tệp Word bị lỗi kiểm tra toàn vẹn.');
    return new TextDecoder('utf-8',{fatal:true}).decode(output);
  }
  throw new Error('Không tìm thấy nội dung word/document.xml trong DOCX.');
}

export async function readDocxFile(file: File): Promise<string> {
  const xml=await extractDocxXml(await file.arrayBuffer());
  const doc=new DOMParser().parseFromString(xml,'application/xml');
  if(doc.getElementsByTagName('parsererror').length) throw new Error('XML trong DOCX không hợp lệ.');
  const paragraphs=Array.from(doc.getElementsByTagNameNS('*','p'));
  const lines=paragraphs.map(p=> {
    let text='';
    const visit=(node: Node)=> {
      if(node.nodeType!==1) return;
      const element=node as Element;
      if(element.localName==='t') { text+=element.textContent||''; return; }
      if(element.localName==='tab') { text+='\t'; return; }
      if(element.localName==='br'||element.localName==='cr') { text+='\n'; return; }
      for(const child of Array.from(element.childNodes)) visit(child);
    };
    visit(p);
    return text;
  });
  const text=lines.join('\n').trim();
  if(!text) throw new Error('DOCX không có văn bản đọc được. Nếu là ảnh scan, vui lòng dùng OCR.');
  return text;
}

// Kiểm tra và đọc PDF: nhận diện text layer hoặc PDF scan
export async function readPdfFile(file: File): Promise<{ text: string; isScanned: boolean }> {
  try {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const decoder = new TextDecoder('latin1');
    const pdfStr = decoder.decode(bytes);

    const textChunks: string[] = [];
    const textObjectRegex = /BT[\s\S]*?ET/g;
    const matches = pdfStr.match(textObjectRegex);

    if (matches && matches.length > 0) {
      for (const block of matches) {
        const stringMatches = block.match(/\(([^)]+)\)\s*(?:Tj|'|")/g);
        if (stringMatches) {
          for (const sm of stringMatches) {
            const clean = sm.replace(/^\(/, '').replace(/\)\s*(?:Tj|'|")$/, '');
            if (clean.trim()) textChunks.push(clean);
          }
        }
      }
    }

    const extracted = textChunks.join(' ').replace(/\s+/g, ' ').trim();

    if (!extracted || extracted.length < 15) {
      return {
        text: '',
        isScanned: true,
      };
    }

    return {
      text: extracted,
      isScanned: false,
    };
  } catch {
    return {
      text: '',
      isScanned: true,
    };
  }
}

// Xử lý OCR hình ảnh thật bằng Tesseract.js (chạy trên client)
export async function runTesseractOCR(
  imageFile: File,
  onProgress?: (progress: number, status: string) => void
): Promise<string> {
  try {
    const result = await Tesseract.recognize(
      imageFile,
      'vie+eng', // Hỗ trợ tiếng Việt và tiếng Anh
      {
        logger: (m: any) => {
          if (onProgress) {
            const progressPercent = typeof m.progress === 'number' ? Math.round(m.progress * 100) : 0;
            onProgress(progressPercent, m.status || 'Đang nhận diện');
          }
        },
      }
    );

    const text = result.data.text ? result.data.text.trim() : '';
    // Chuẩn hóa khoảng trắng và dòng
    return text.normalize('NFC').replace(/\r\n/g, '\n').replace(/[ \t]+/g, ' ');
  } catch (err: any) {
    throw new Error(`Lỗi nhận dạng ảnh bằng Tesseract: ${err.message || 'Không xác định'}`);
  }
}

// Cập nhật theo phiếu giáo viên ngày 13/10/2026.
