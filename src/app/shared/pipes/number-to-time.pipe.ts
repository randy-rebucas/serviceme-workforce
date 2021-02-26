import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'numberToTime'
})
export class NumberToTimePipe implements PipeTransform {

  transform(value: any, ...args: any[]): any {
    const hours = Math.floor(value / 60);
    const minutes = value % 60;
    return hours + ':' + minutes;
  }

}
