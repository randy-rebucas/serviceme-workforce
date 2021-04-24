import { Directive } from '@angular/core';
import { ValidatorFn, AbstractControl } from '@angular/forms';
import { PhoneNumberUtil, PhoneNumber } from 'google-libphonenumber';

const phoneNumberUtil = PhoneNumberUtil.getInstance();

export function PhoneNumberValidator(regionCode: string): ValidatorFn {
  console.log(regionCode);
  return (control: AbstractControl): {[key: string]: any} | null => {
    const phoneNumber = (control.value) ? phoneNumberUtil.parseAndKeepRawInput( control.value, regionCode) : '';
    return (phoneNumber) ? phoneNumberUtil.isValidNumber(phoneNumber) ? { wrongNumber: {value: control.value} } : null : null;
  };
}

@Directive({
  selector: '[appIntlPhoneValidation]'
})
export class IntlPhoneValidationDirective {

  constructor() { }

}
