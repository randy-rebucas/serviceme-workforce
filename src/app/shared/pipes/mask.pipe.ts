import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'mask'
})
export class MaskPipe implements PipeTransform {

  transform(value: any, ...args: any[]): any {
    let m = '----';
    let x = 0;
    for (let i = 0; i < args[0]; i++) {
      x = i;
    }
    m = args[1];
    const toBeReplaced = value.slice(0, x);
    return value.replace(toBeReplaced, m);
  }

}
