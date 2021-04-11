import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'mask'
})
export class MaskPipe implements PipeTransform {

  transform(value: any, ...args: any[]): any {
    console.log(value);
    if (value) {
      return value.replace(value.slice(0, 7), '---');
    }
  }

}
