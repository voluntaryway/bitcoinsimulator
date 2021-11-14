export class FloatformatValueConverter {
  toView(value, precision = 2) {
    if (isNan(value) || value < 1) {
      return value;
    }

    return value.toPrecision(precision);
  }
}
