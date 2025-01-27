import { Injectable } from '@angular/core';


export type BankData = { date: string; totalAmount: number };
export type ZReportData = { date: string; totalCash: number; totalNoCash: number; totalRetSum: number };
export type MergedData = {
  date: string;
  zSumNonCash: number;
  bankSum: number;
  zSumCash: number;
  zRetSum: number;
  zNonCashShifted: number | null;
  differenceBankZ: number | null;
  result: number | null;
};

@Injectable({
  providedIn: 'root'
})
export class SummaryServiceService {

  constructor() { }

  groupBankData(bankData: { date: string; amount: number }[]): { date: string; totalAmount: number }[] {
    const groupedData: { [date: string]: number } = {};

    bankData.forEach((row) => {
      if (!groupedData[row.date]) {
        groupedData[row.date] = 0;
      }
      groupedData[row.date] += row.amount;
    });

    return Object.entries(groupedData).map(([date, totalAmount]) => ({
      date,
      totalAmount: parseFloat(totalAmount.toFixed(2)), // Округление до 2 знаков
    }));
  }

  /**
   * Группировка Z-отчетов.
   * @param zReportData - Массив данных Z-отчетов.
   * @returns Группированные данные.
   */
  groupZReportData(
    zReportData: { date: string; cash: number; noCash: number; retSum: number }[]
  ): { date: string; totalCash: number; totalNoCash: number; totalRetSum: number }[] {
    const groupedData: { [date: string]: { totalCash: number; totalNoCash: number; totalRetSum: number } } = {};

    zReportData.forEach((row) => {
      if (!groupedData[row.date]) {
        groupedData[row.date] = { totalCash: 0, totalNoCash: 0, totalRetSum: 0 };
      }
      groupedData[row.date].totalCash += row.cash;
      groupedData[row.date].totalNoCash += row.noCash;
      groupedData[row.date].totalRetSum += row.retSum;
    });

    return Object.entries(groupedData).map(([date, { totalCash, totalNoCash, totalRetSum }]) => ({
      date,
      totalCash: parseFloat(totalCash.toFixed(2)),
      totalNoCash: parseFloat(totalNoCash.toFixed(2)),
      totalRetSum: parseFloat(totalRetSum.toFixed(2)),
    }));
  }

  mergeReportAndStatement(
    summarizedBankData: { date: string; totalAmount: number }[],
    summarizedZReports: { date: string; totalCash: number; totalNoCash: number; totalRetSum: number }[]
  ): {
    date: string;
    zSumNonCash: number;
    bankSum: number;
    zSumCash: number;
    zRetSum: number;
    zCashCorrection: number;
    difference: number;
    result: number;
  }[] {
    const mergedData: {
      date: string;
      zSumNonCash: number;
      bankSum: number;
      zSumCash: number;
      zRetSum: number;
      zCashCorrection: number;
      difference: number;
      result: number;
    }[] = [];

    summarizedBankData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    summarizedZReports.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());


    console.log(summarizedBankData, summarizedZReports);

    const bankDataMap = summarizedBankData.reduce((acc, entry) => {
      acc[entry.date] = entry.totalAmount;
      return acc;
    }, {} as { [date: string]: number });

    console.log(bankDataMap);

    const zReportMap = summarizedZReports.reduce((acc, entry) => {
      acc[entry.date] = entry;
      return acc;
    }, {} as { [date: string]: { totalCash: number; totalNoCash: number; totalRetSum: number } });

    console.log(zReportMap);
/*
    const dates = Array.from(
      new Set([
        ...Object.keys(bankDataMap),
        ...Object.keys(zReportMap)
      ])
    ).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());*/
    const dates = Array.from(
      new Set([
        ...Object.keys(bankDataMap),
        ...Object.keys(zReportMap),
      ])
    ).sort((a, b) => {
      const dateA = new Date(a.split('.').reverse().join('-')).getTime();
      const dateB = new Date(b.split('.').reverse().join('-')).getTime();
      return dateA - dateB;
    });

    console.log(dates);

    const shiftedNonCash: { [date: string]: number | null } = {};
    let previousNonCash = 0;

    dates.forEach((date) => {
      if (zReportMap[date]) {
        shiftedNonCash[date] = previousNonCash;
        previousNonCash = zReportMap[date].totalNoCash;
      } else {
        shiftedNonCash[date] = previousNonCash;
      }
    });

    dates.forEach((date) => {
      const bankSum = bankDataMap[date] || 0;
      const zReportEntry = zReportMap[date] || null;

      const zSumCash = zReportEntry?.totalCash || 0;
      const zSumNonCashShifted = shiftedNonCash[date] || 0;
      const zRetSum = zReportEntry?.totalRetSum || 0;

      const differenceBankZ = bankSum - zSumNonCashShifted;
      const result = zSumCash + zRetSum - zSumNonCashShifted;

      mergedData.push({
        date,
        zSumNonCash: zSumNonCashShifted,
        bankSum,
        zSumCash,
        zRetSum,
        zCashCorrection: 0, // Will be calculated below
        difference: parseFloat(differenceBankZ.toFixed(2)),
        result: parseFloat(result.toFixed(2)),
      });
    });

    // Additional calculations
    mergedData.forEach((entry, index) => {
      const bankValue = entry.bankSum || 0;
      const znoCashValue = entry.zSumNonCash || 0;

      // Calculate difference
      entry.difference = parseFloat((bankValue - znoCashValue).toFixed(2));

      // Update zCashCorrection for the current and previous row
      if (index > 0) {
        const previousEntry = mergedData[index - 1];
        previousEntry.zCashCorrection = parseFloat((previousEntry.zSumCash - entry.difference).toFixed(2));

        // Calculate Result for the previous row
        previousEntry.result = parseFloat(
          (previousEntry.bankSum + previousEntry.zCashCorrection - previousEntry.zRetSum).toFixed(2)
        );
      }

      // For the last row
      if (index === mergedData.length - 1) {
        entry.zCashCorrection = 0;

        // Calculate Result for the last row
        entry.result = parseFloat(
          (bankValue + entry.zCashCorrection - (entry.zRetSum || 0)).toFixed(2)
        );
      }
    });

    console.log(mergedData);

    return mergedData;
  }

}
