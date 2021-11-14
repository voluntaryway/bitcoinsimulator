

import { inject, bindable } from 'aurelia-framework';
import { state } from './state';

@inject(state)

export class curve {
  @bindable multiple
  @bindable x
  @bindable y
  @bindable eng

  constructor(state) {
    this.state = state;
    this.history = [];
  }

  attached() {
    this.board = JXG.JSXGraph.initBoard('box', { grid: false, boundingbox: [-4, 8, 6, -8], axis: true });

    this.fp = this.plot(this.f);
    this.fn = this.plot(this.fneg);
    this.multiple = 1;


    this.x = -1;
    this.y = this.f(-1);

    this.startPoint = this.createPoint(this.x, this.y, 1);
  }

  async animate() {
    for (let i = 0; i < 100; i++) {
      this.doublePoint(this.x, this.y);
      await new Promise(r => setTimeout(r, 100));
    }
  }


  addPoint(x, y) {
    this.history.push([x, y, this.multiple]);
    this.clearBoard();
    if (x === -1) return this.doublePoint(x, y, true);
    this.startPoint = this.createPoint(-1, this.f(-1), 1);
    this.inputPoint = this.createPoint(x, y, this.multiple);

    this.multiple += 1;

    this.line = this.board.create('line', [this.startPoint, this.inputPoint], { strokeColor: 'grey', strokewidth: 1 });

    let m = this.line.getSlope();
    let t = this.line.getRise();

    let solution = solveCubic(1, -(m ** 2), -2 * m * t, 7 - t ** 2);
    let index = 0;
    for (let i = 0; i < solution.length; i++) {
      if (solution[i].toFixed(2) - this.startPoint.X().toFixed(2) == 0) continue;
      if (solution[i].toFixed(2) - this.inputPoint.X().toFixed(2) == 0) continue;
      index = i;
    }

    let max = Math.max(...solution.map(Math.abs));
    if (max > 4) this.board.setBoundingBox([-max * 1.5, this.f(max) * 2, max * 2, -this.f(max) * 2], false);
    else if ( this.board.getBoundingBox[0] === -4) this.board.setBoundingBox([-4, 8, 6, -8]);

    if ((m * solution[index] + t) > 0) {
      this.intersect = this.board.create('point', [solution[index], this.f(solution[index])], {
        size: 1, fixed: true, color: 'black', withLabel: false
      });
    } else {
      this.intersect = this.board.create('point', [solution[index], this.fneg(solution[index])], {
        size: 1, fixed: true, color: 'black', withLabel: false
      });
    }

    this.vertical = this.board.create('line', [this.intersect, [this.intersect.X(), -this.intersect.Y()]], { straightFirst: false, straightLast: false, strokeColor: 'orange', dash: 2 });
    this.endPoint = this.createPoint(this.intersect.X(), -this.intersect.Y(), this.multiple);

    this.x = this.intersect.X();
    this.y = -this.intersect.Y();
  }

  doublePoint(x, y, flag) {
    let t0 = performance.now();
    if (!flag) this.history.push([x, y, this.multiple]);

    this.clearBoard();

    this.startPoint = this.createPoint(x, y, this.multiple);
    this.multiple *= 2;

    let m = 3 * (x ** 2) / (2 * this.f(x));
    if (y < 0) m *= -1;
    let t = y - m * x;

    this.tangent = this.board.create('line', [this.startPoint, [0, t]], { strokeColor: 'grey', strokewidth: 1 });


    let solution = solveCubic(1, -(m ** 2), -2 * m * t, 7 - t ** 2);

    let index = 0;
    let diff = 0;
    for (let i = 0; i < solution.length; i++) {
      let d = Math.abs(solution[i] - this.startPoint.X());

      if (d > diff) {
        diff = d;
        index = i;
      }
    }
    let max = Math.max(...solution.map(Math.abs));


    if (max > 4) this.board.setBoundingBox([-max * 1.5, this.f(max) * 2, max * 2, -this.f(max) * 2], false);
    else if ( this.board.getBoundingBox[0] === -4) this.board.setBoundingBox([-4, 8, 6, -8]);

    let t1 = performance.now();


    if ((m * solution[index] + t) > 0) {
      this.intersect = this.board.create('point', [solution[index], this.f(solution[index])], {
        size: 1, fixed: true, color: 'black', withLabel: false
      });
    } else {
      this.intersect = this.board.create('point', [solution[index], this.fneg(solution[index])], {
        size: 1, fixed: true, color: 'black', withLabel: false
      });
    }

    this.vertical = this.board.create('line', [this.intersect, [this.intersect.X(), -this.intersect.Y()]], { straightFirst: false, straightLast: false, strokeColor: 'orange', dash: 2 });
    this.endPoint = this.createPoint(this.intersect.X(), -this.intersect.Y(), this.multiple);

    this.x = this.intersect.X();
    this.y = -this.intersect.Y();


    this.time = t1 - t0;
  }

  stepBack() {
    this.clearBoard();
    let p = this.history[this.history.length - 1];
    this.x = p[0];
    this.y = p[1];
    this.multiple = p[2];
    this.startPoint = this.createPoint(this.x, this.y, this.multiple);
    let max = this.x;
    if (max > 4) this.board.setBoundingBox([-max * 1.5, this.f(max) * 2, max * 2, -this.f(max) * 2], false);
    else if ( this.board.getBoundingBox[0] === -4) this.board.setBoundingBox([-4, 8, 6, -8]);
    this.history.pop();
  }

  createPoint(x, y, multiple) {
    let lab = '<span class="has-text-grey has-text-weight-bold is-size-6">G</span>';
    if (multiple > 1) lab = '<span class="has-text-black is-size-6">' + multiple + '<span class="has-text-black has-text-weight-bold" style="margin-left:0.1rem;">G</span></span>';
    return this.board.create('point', [x, y], {
      size: 2, name: lab, fixed: true, label: {
        offset: [0, 15],
        anchorX: 'middle',
        anchorY: 'middle'
      }
    });
  }

  f(x) {
    return Math.sqrt(x ** 3 + 7);
  }

  fneg(x) {
    return -Math.sqrt(x ** 3 + 7);
  }


  plot(func, atts) {
    if (atts == null) {
      return this.addCurve(this.board, func, { strokewidth: 2, strokeColor: 'cornflowerblue' });
    }
    return this.addCurve(this.board, func, atts);
  }

  addCurve(board, func, atts) {
    let f = this.board.create('functiongraph', [func], atts);
    return f;
  }

  clearBoard() {
    this.board.suspendUpdate();

    // for(let i = 33; i < this.board.objectsList.length; i++) {
    //   this.board.removeObject(this.board.objectsList[i])
    // }

    this.board.removeObject(this.startPoint);
    this.board.removeObject(this.endPoint);
    this.board.removeObject(this.vertical);
    this.board.removeObject(this.tangent);
    this.board.removeObject(this.intersect);
    this.board.removeObject(this.line);
    this.board.removeObject(this.inputPoint);

    this.board.unsuspendUpdate();
  }
}


function cuberoot(x) {
  let y = Math.pow(Math.abs(x), 1 / 3);
  return x < 0 ? -y : y;
}

function solveCubic(a, b, c, d) {
  if (Math.abs(a) < 1e-8) { // Quadratic case, ax^2+bx+c=0
    a = b; b = c; c = d;
    if (Math.abs(a) < 1e-8) { // Linear case, ax+b=0
      a = b; b = c;
      if (Math.abs(a) < 1e-8) // Degenerate case
      {return [];}
      return [-b / a];
    }

    var D = b * b - 4 * a * c;
    if (Math.abs(D) < 1e-8) {return [-b / (2 * a)];} else if (D > 0) {return [(-b + Math.sqrt(D)) / (2 * a), (-b - Math.sqrt(D)) / (2 * a)];}
    return [];
  }

  // Convert to depressed cubic t^3+pt+q = 0 (subst x = t - b/3a)
  let p = (3 * a * c - b * b) / (3 * a * a);
  let q = (2 * b * b * b - 9 * a * b * c + 27 * a * a * d) / (27 * a * a * a);
  let roots;

  if (Math.abs(p) < 1e-8) { // p = 0 -> t^3 = -q -> t = -q^1/3
    roots = [cuberoot(-q)];
  } else if (Math.abs(q) < 1e-8) { // q = 0 -> t^3 + pt = 0 -> t(t^2+p)=0
    roots = [0].concat(p < 0 ? [Math.sqrt(-p), -Math.sqrt(-p)] : []);
  } else {
    var D = q * q / 4 + p * p * p / 27;
    if (Math.abs(D) < 1e-8) {       // D = 0 -> two roots
      roots = [-1.5 * q / p, 3 * q / p];
    } else if (D > 0) {             // Only one real root
      var u = cuberoot(-q / 2 - Math.sqrt(D));
      roots = [u - p / (3 * u)];
    } else {                        // D < 0, three roots, but needs to use complex numbers/trigonometric solution
      var u = 2 * Math.sqrt(-p / 3);
      let t = Math.acos(3 * q / p / u) / 3;  // D < 0 implies p < 0 and acos argument in [-1..1]
      let k = 2 * Math.PI / 3;
      roots = [u * Math.cos(t), u * Math.cos(t - k), u * Math.cos(t - 2 * k)];
    }
  }

  // Convert back from depressed cubic
  for (let i = 0; i < roots.length; i++) {roots[i] -= b / (3 * a);}

  return roots;
}

