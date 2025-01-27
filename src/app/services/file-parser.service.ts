import { Injectable } from '@angular/core';
import {format, parse} from 'date-fns';

@Injectable({
  providedIn: 'root'
})
export class FileParserService {

  constructor() { }

  parseAvalBank(headers: string[], rows: { [key: string]: any }[]): { rows: any[] } {

    const dateIndex = headers.indexOf('Дата операції');
    const amountIndex = headers.indexOf('Кредит');
    const descriptionIndex = headers.indexOf('Призначення платежу');

    if (dateIndex === -1 || amountIndex === -1 || descriptionIndex === -1) {
      throw new Error('Не найдены необходимые колонки для АвальБанка');
    }

    const processedRows = rows
        .filter((row) => row['Кредит'])
        .map((row) => {
          const date = this.parseDate(row['Дата операції'].split(' ')[0], 'dd.MM.yyyy');
          let amount = parseFloat(row['Кредит']) || 0;
          const description = row['Призначення платежу'] || '';
          const commissionMatch = description.match(/комісія (\d+(\.\d+)?)/);
          const commission = commissionMatch ? parseFloat(commissionMatch[1].replace(',', '.')) : 0;
          //amount += commission;
          amount = parseFloat((amount + commission).toFixed(2));
          return { date, amount };
        });


        const groupedRows = this.groupByDate(processedRows);

        return { rows: groupedRows };
  }

  parseMonobank(headers: string[], rows: { [key: string]: any }[]): { rows: any[] } {

    const amountIndex = headers.indexOf('Сума операції');
    const commissionIndex = headers.indexOf('Сума комісій, грн');
    const dateIndex = headers.indexOf('Дата операції');

    if (dateIndex === -1 || amountIndex === -1 || commissionIndex === -1) {
      throw new Error('Не найдены необходимые колонки для Монобанка');
    }

    const processedRows = rows.map((row) => {
      const date = this.parseDate(row['Дата операції'].split(' ')[0], 'dd.MM.yyyy');
      let amount = parseFloat(row['Сума операції']) || 0;
      const commission = parseFloat(row['Сума комісій, грн']) || 0;
      // amount += commission;
      amount = parseFloat((amount + commission).toFixed(2));
      return { date, amount}
    }).filter((row) => row.amount > 0); ;


    let groupedRows = this.groupByDate(processedRows);

    const typedRows = groupedRows.map((row) => ({
      date: row.date,
      amount: row.amount,
    }));

    let sortedRows = typedRows.sort((a, b) => {
      const dateA = typeof a.date === 'string'
        ? new Date(a.date.split('.').reverse().join('-')) // Преобразуем строку в ISO-формат
        : a.date;
      const dateB = typeof b.date === 'string'
        ? new Date(b.date.split('.').reverse().join('-'))
        : b.date;
      return dateA.getTime() - dateB.getTime();
    });

    return { rows: sortedRows };

  }


  parseNovaPay(headers: string[], rows: { [key: string]: any }[]): { rows: any[] } {
    const dateIndex = headers.indexOf('Дата/час операції');
    const amountIndex = headers.indexOf('Кредит');

    if (dateIndex === -1 || amountIndex === -1) {
      throw new Error('Не найдены необходимые колонки для НоваПей');
    }

    const processedRows = rows.map((row) => {
      const date = this.parseDate(row['Дата/час операції'].split(' ')[0], 'dd.MM.yyyy');
      const amount = parseFloat(row['Кредит']) || 0;
      return { date, amount };
    }).filter((row) => row.amount > 0);


    const groupedRows = this.groupByDate(processedRows);

    return { rows: groupedRows };
  }




  parseZReports(headers: string[], rows: { [key: string]: any }[]): { rows: any[] } {
    const dateIndex = headers.indexOf('OrderDateTime');
    const cashIndex = headers.indexOf('RlzSumCash');
    const nonCashIndex = headers.indexOf('RlzSumNonCash');
    const returnsIndex = headers.indexOf('RetSum');

    if (dateIndex === -1 || cashIndex === -1 || nonCashIndex === -1 || returnsIndex === -1) {
      throw new Error('Не найдены необходимые колонки для Z-отчетов');
    }

    const processedRows = rows
        .map((row) => {
          const date = this.parseExcelDate(row['OrderDateTime']);
          const cash = parseFloat(row['RlzSumCash']) || 0;
          const noCash = parseFloat(row['RlzSumNonCash']) || 0;
          const retSum = parseFloat(row['RetSum']) || 0;

          return {date, cash, noCash, retSum};
        });


        const groupByDateZRep = this.groupByDateZRep(processedRows);
        return {rows: groupByDateZRep};
  }

  parsePrivatBank(headers: string[], rows: { [key: string]: any }[]): { rows: any[] } {

    const processedRows =
    rows
      .filter((row) => row['Дата операції'] && row['Сума']) // Убираем строки с отсутствующими данными
      .map((row) => {
        console.log(`date ${row['Дата операції']} summ = ${row['Сума']} description = ${row['Призначення платежу']}`);
        const date = this.parseDate(row['Дата операції'], 'dd.MM.yyyy');
        const amountRaw = String(row['Сума'])?.replace(/\s/g, '') || '0'; // Убираем пробелы из строки
        let amount = parseFloat(amountRaw) || 0;


        const description = row['Призначення платежу'] || '';
        const commissionMatch = description.match(/Ком бан (\d+(\.\d+)?)/);
        const commission = commissionMatch ? parseFloat(commissionMatch[1]) : 0;

        //amount += commission;
        amount = parseFloat((amount + commission).toFixed(2));

        return { date, amount };
      })
      .filter((row) => row.amount > 0); // Оставляем только строки с положительной суммой

    const groupedRows = this.groupByDate(processedRows);

    return { rows: groupedRows };
  }


  private parseDate(date: string | number, formatString: string): string {
    try {
      if (typeof date === 'number') {
        // Если дата представлена в формате числа (Excel), преобразуем её
        return this.parseExcelDate(date);
      }

      // Если строка соответствует формату dd.MM.yyyy
      if (/^\d{2}\.\d{2}\.\d{4}$/.test(date)) {
        return format(parse(date, 'dd.MM.yyyy', new Date()), formatString);
      }

      throw new Error(`Неизвестный формат даты: ${date}`);
    } catch (error) {
      console.error(`Ошибка парсинга даты: ${date} с форматом: ${formatString}`, error);
      return String(date); // Возвращаем исходное значение даты в случае ошибки
    }
  }

  private parseExcelDate(excelDate: number): string {
    const excelEpoch = new Date(Date.UTC(1900, 0, 1));
    const actualDate = new Date(excelEpoch.getTime() + (excelDate - 2) * 86400000); // Учитываем смещение Excel
    return format(actualDate, 'dd.MM.yyyy');
  }

  groupByDateZRep(rows: { date: string; cash: number; noCash: number; retSum: number }[]): { date: string; cash: number; noCash: number; retSum: number }[] {
    const grouped = rows.reduce((acc, row) => {
      if (!acc[row.date]) {
        acc[row.date] = { date: row.date, cash: 0, noCash: 0, retSum: 0 };
      }

      // Суммирование и округление значений
      acc[row.date].cash = parseFloat((acc[row.date].cash + row.cash).toFixed(2));
      acc[row.date].noCash = parseFloat((acc[row.date].noCash + row.noCash).toFixed(2));
      acc[row.date].retSum = parseFloat((acc[row.date].retSum + row.retSum).toFixed(2));

      return acc;
    }, {} as { [date: string]: { date: string; cash: number; noCash: number; retSum: number } });

    // Преобразование объекта в массив
    return Object.values(grouped);
  }

  groupByDate(rows: { date: string; amount: number }[]): { date: string; amount: number }[] {
    const grouped = rows.reduce((acc, row) => {
      if (!acc[row.date]) {
        acc[row.date] = { date: row.date, amount: 0 };
      }
      acc[row.date].amount += row.amount;
      acc[row.date].amount = parseFloat(acc[row.date].amount.toFixed(2));
      return acc;
    }, {} as { [date: string]: { date: string; amount: number } });

    return Object.values(grouped);
  }
}
