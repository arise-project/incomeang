import { Component } from '@angular/core';
import { FileService } from '../../services/file.service';
import { FileParserService } from '../../services/file-parser.service';
import { SummaryServiceService } from '../../services/summary-service.service';
import { CommonModule } from '@angular/common';
import { DataViewerComponentComponent } from "../data-viewer-component/data-viewer-component.component";
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-file-loader',
  standalone: true,
  templateUrl: './file-loader.component.html',
  styleUrls: ['./file-loader.component.scss'],
  imports: [CommonModule, DataViewerComponentComponent],
})

export class FileLoaderComponent {
  files: File[] = [];
  rawData: { fileName: string; headers: string[]; rows: any[] }[] = [];
  errors: string[] = [];
  parsedData: { [fileName: string]: { rows: any[]} } = {};
  summarizedBankData: { date: string; totalAmount: number }[] = [];
  summarizedZReports: { date: string; totalCash: number; totalNoCash: number; totalRetSum: number }[] = [];

  activeTab: string = 'raw';
  incomeReport: any[] = [];



  constructor(
    private fileService: FileService,
    private fileParserService: FileParserService,
    private summaryService: SummaryServiceService) {}


  // Метод экспорта данных в Excel
  exportToExcel(): void {
    const worksheet = XLSX.utils.json_to_sheet(this.incomeReport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Итоговая таблица');
    XLSX.writeFile(workbook, 'IncomeReport.xlsx');
  }

  onDirectorySelected(event: any): void {
    const fileList: FileList = event.target.files;
    if (fileList) {
      this.files = Array.from(fileList);
      this.errors = [];

      let fileValue = 0;
      // Чтение каждого файла
      this.files.forEach((file) => {
        this.fileService.readFile(file).then(
          ({type, data, encoding, delimetr}) => {
            const {headers, rows} = this.fileService.parseFile(type, data, encoding, delimetr);

            this.rawData.push({
              fileName: file.name,
              headers: headers,
              rows: rows,
            });

            console.log('Ishodnie dannie:', rows);
            console.log(file.name);

            if(/^\d{16}\.csv$/.test(file.name)){ // Privat Bank
              const privatParsed = this.fileParserService.parsePrivatBank(headers, rows);
              this.parsedData['bank' + fileValue] = privatParsed;
              console.log(`Data from Privat from ${file.name}:`, privatParsed);
            } else if (file.name.startsWith('export') && file.name.split('.').pop() === 'csv'){ // Aval Bank
              const avalParsed = this.fileParserService.parseAvalBank(headers, rows);
              this.parsedData['bank' + fileValue] = avalParsed;
              console.log(`Data from Aval from ${file.name}: `, avalParsed);
            } else if(file.name.startsWith('report_')){ // MonoBank
              let monoParsed = this.fileParserService.parseMonobank(headers, rows);
              this.parsedData['bank' + fileValue] = monoParsed;
              console.log(`Data from Mono bank ${file.name} : `, monoParsed);
            } else if(file.name.startsWith('NovaPay')){ // NovaPay
              const novaPayParsed = this.fileParserService.parseNovaPay(headers, rows);
              this.parsedData['bank' + fileValue] = novaPayParsed;
              console.log(`Data from NovaPay ${file.name} : `, novaPayParsed);
            } else if(file.name.startsWith('Реєстр_платежів_')) {

            } else if (file.name.split('.').pop() === 'xlsx'){ // Z-report
              const zreportParsed = this.fileParserService.parseZReports(headers, rows);
              this.parsedData['zreport' + fileValue] = zreportParsed;
              console.log(`Data from Z-Report ${file.name} : `, zreportParsed);
            }
            fileValue++;

          },
          (error) => {
            console.error(`Ошибка чтения ${file.name}:`, error);
          }
        );
      });
    }
  }


  get fileData(): { fileName: string; headers: string[]; rows: any[] }[] {
    return this.rawData.map((data) => ({
      fileName: data.fileName,
      headers: data.headers,
      rows: data.rows,
    }));
  }

  get fileParsed(): { fileName: string; headers: string[]; rows: any[] }[] {
    return Object.keys(this.parsedData).map((fileName) => ({
      fileName,
      headers: Object.keys(this.parsedData[fileName].rows[0] || {}),
      rows: this.parsedData[fileName].rows,
    }));
  }
  /**
   * Группировка данных по дате и вывод в консоль.
   */
  onSummary(): void {
    console.log('Сгруппировать данные');
    const bankData: { date: string; amount: number }[] = [];
    const zReportData: { date: string; cash: number; noCash: number; retSum: number }[] = [];

    Object.keys(this.parsedData).forEach((key) => {
      if (key.startsWith('bank')) {
        bankData.push(...this.parsedData[key].rows);
      } else if (key.startsWith('zreport')) {
        zReportData.push(...this.parsedData[key].rows);
      }
    });
    this.summarizedBankData = this.summaryService.groupBankData(bankData);
    this.summarizedZReports = this.summaryService.groupZReportData(zReportData);

    console.log('Bank data: ', this.summarizedBankData);
    console.log('z-report: ', this.summarizedZReports);
  }

  onGenerateIncomeReport(): void {
    this.incomeReport = this.summaryService.mergeReportAndStatement(
      this.summarizedBankData,
      this.summarizedZReports
    );
    console.log('Итоговая таблица:', this.incomeReport);
    this.activeTab = 'summary'; // Переключаемся на вкладку "Итоговая таблица"

    console.log('Income Report: ', this.incomeReport);
  }
}
