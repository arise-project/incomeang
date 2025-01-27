import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';
import * as Papa from 'papaparse';

@Injectable({
  providedIn: 'root'
})

export class FileService {
  constructor() { }

  private getFileType(fileName: string): 'csv' | 'xlsx' | 'dbf' | 'unknown' {
    const extension = fileName.split('.').pop()?.toLowerCase() || '';
    switch(extension){
      case 'csv': return 'csv';
      case 'xlsx': return 'xlsx';
      default: return 'unknown';
    }
  }

  readFile(file: File): Promise<{type: string; data: ArrayBuffer; encoding: string; delimetr: string}>{
    const fileType = this.getFileType(file.name);
    const encoding = this.detectEncoding(file.name);
    const delimetr = this.getDelimiter(file.name);

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event: any) => {
        resolve({ type: fileType, data: event.target.result, encoding: encoding, delimetr });
      };
      reader.onerror = () => reject('Error read file');
      reader.readAsArrayBuffer(file);
    });
  }

parseFile(fileType: string, data: ArrayBuffer, encoding: string, delimetr: string): {headers: string[]; rows: any[]}{
  switch(fileType){
    case 'csv':
      return this.parseCSV(fileType, data, encoding, delimetr);
    case 'xlsx':
      return this.parseXLSX(fileType, data, encoding);
    default:
      throw new Error('Unknown format file');
  }
}

private parseCSV(fileType: string, data: ArrayBuffer, encoding: string, delimiter: string): { headers: string[]; rows: any[] } {
  const decoder = new TextDecoder(encoding);
  const decodedText = decoder.decode(data);
  console.log(`decoded text: `, decodedText);

  //const delimiter = this.getDelimiter(fileType); // Получаем разделитель для файла
  console.log(`delimetr: ${delimiter}`);

  const results = Papa.parse(decodedText, {
    header: true, // Указываем, что первая строка содержит заголовки
    delimiter: delimiter,
    skipEmptyLines: true, // Пропуск пустых строк
  });

  if (results.errors.length > 0) {
    console.error('Ошибка обработки CSV:', results.errors);
    throw new Error('Error parsing CSV file');
  }

  const headers = results.meta.fields || [];
  const rows = results.data;

  return { headers, rows };
}

private parseXLSX(fileType: string, data: ArrayBuffer, encoding: string): { headers: string[]; rows: any[] } {
  const workbook = XLSX.read(data, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<{ [key: string]: any }>(worksheet, { defval: null, raw: true });
  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
  return { headers, rows };
}

private getDelimiter(fileType: string): string {
  // Определяем разделитель для каждого банка
  if (/^\d{16}\.csv$/.test(fileType)) {
    return ';'; // ПриватБанк
  }
  if (fileType.startsWith('export')) {
    return ';'; // АвальБанк
  }
  if (fileType.startsWith('report_')) {
    return ','; // МоноБанк
  }
  if (fileType.startsWith('NovaPay')) {
    return ';'; // НоваПей
  }
  return ','; // По умолчанию
}

private detectEncoding(fileName: string): string {
  // Если имя файла состоит из 16 цифр, это ПриватБанк
  if (/^\d{16}\.csv$/.test(fileName)) {
    return 'windows-1251'; // ПриватБанк
  }

  // Если имя файла начинается с "export", это АвальБанк
  if (fileName.startsWith('export')) {
    return 'windows-1251'; // АвальБанк
  }

  // Если имя файла начинается с "report_", это МоноБанк
  if (fileName.startsWith('report_')) {
    return 'utf-8'; // МоноБанк
  }

  // Если имя файла начинается с "NovaPay", это НоваПей
  if (fileName.startsWith('NovaPay')) {
    return 'utf-8'; // НоваПей
  }

  // По умолчанию UTF-8
  return 'utf-8';
}

}
