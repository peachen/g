const Util = require('../util/index');
const Shape = require('../core/shape');
const Inside = require('./util/inside');
const Arrow = require('./util/arrow');
const LineMath = require('./math/line');

const Polyline = function(cfg) {
  Polyline.superclass.constructor.call(this, cfg);
};

Polyline.ATTRS = {
  points: null,
  lineWidth: 1,
  startArrow: false,
  endArrow: false,
  tCache: null
};

Util.extend(Polyline, Shape);

Util.augment(Polyline, {
  canStroke: true,
  type: 'polyline',
  tCache: null, // 缓存各点的t
  getDefaultAttrs() {
    return {
      lineWidth: 1,
      startArrow: false,
      endArrow: false
    };
  },
  calculateBox() {
    const self = this;
    const attrs = self.__attrs;
    const lineWidth = attrs.lineWidth;
    const points = attrs.points;
    if (!points || points.length === 0) {
      return null;
    }
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    Util.each(points, function(point) {
      const x = point[0];
      const y = point[1];
      if (x < minX) {
        minX = x;
      }
      if (x > maxX) {
        maxX = x;
      }

      if (y < minY) {
        minY = y;
      }

      if (y > maxY) {
        maxY = y;
      }
    });

    const halfWidth = lineWidth / 2;
    return {
      minX: minX - halfWidth,
      minY: minY - halfWidth,
      maxX: maxX + halfWidth,
      maxY: maxY + halfWidth
    };
  },
  __setTcache() {
    const self = this;
    const attrs = self.__attrs;
    const points = attrs.points;
    let totalLength = 0;
    let tempLength = 0;
    const tCache = [];
    let segmentT;
    let segmentL;
    if (!points || points.length === 0) {
      return;
    }

    Util.each(points, function(p, i) {
      if (points[i + 1]) {
        totalLength += LineMath.len(p[0], p[1], points[i + 1][0], points[i + 1][1]);
      }
    });
    if (totalLength <= 0) {
      return;
    }
    Util.each(points, function(p, i) {
      if (points[i + 1]) {
        segmentT = [];
        segmentT[0] = tempLength / totalLength;
        segmentL = LineMath.len(p[0], p[1], points[i + 1][0], points[i + 1][1]);
        tempLength += segmentL;
        segmentT[1] = tempLength / totalLength;
        tCache.push(segmentT);
      }
    });
    this.tCache = tCache;
  },
  isPointInPath(x, y) {
    const self = this;
    const attrs = self.__attrs;
    if (self.hasStroke()) {
      const points = attrs.points;
      if (points.length < 2) {
        return false;
      }
      const lineWidth = attrs.lineWidth;
      return Inside.polyline(points, lineWidth, x, y);
    }
    return false;
  },
  createPath(context) {
    const self = this;
    const attrs = self.__attrs;
    const points = attrs.points;
    let l;
    let i;

    if (points.length < 2) {
      return;
    }
    context = context || self.get('context');
    context.beginPath();

    Arrow.addStartArrow(context, attrs, points[1][0], points[1][1], points[0][0], points[0][1]);
    context.moveTo(points[0][0], points[0][1]);
    for (i = 1, l = points.length - 1; i < l; i++) {
      context.lineTo(points[i][0], points[i][1]);
    }
    context.lineTo(points[l][0], points[l][1]);
    Arrow.addEndArrow(context, attrs, points[l - 1][0], points[l - 1][1], points[l][0], points[l][1]);
  },
  getPoint(t) {
    const attrs = this.__attrs;
    const points = attrs.points;
    let tCache = this.tCache;
    let subt;
    let index;
    if (!tCache) {
      this.__setTcache();
      tCache = this.tCache;
    }
    Util.each(tCache, function(v, i) {
      if (t >= v[0] && t <= v[1]) {
        subt = (t - v[0]) / (v[1] - v[0]);
        index = i;
      }
    });
    return {
      x: LineMath.at(points[index][0], points[index + 1][0], subt),
      y: LineMath.at(points[index][1], points[index + 1][1], subt)
    };
  }
});

module.exports = Polyline;
