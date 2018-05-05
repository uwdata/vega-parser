import {
  Top, Bottom, Left, Right, Center,
  Start, End, GroupTitleStyle
} from './guides/constants';
import guideMark from './guides/guide-mark';
import {lookup} from './guides/guide-util';
import parseMark from './mark';
import {TextMark} from './marks/marktypes';
import {TitleRole} from './marks/roles';
import {addEncode, encoder} from './encode/encode-util';
import {ref} from '../util';
import {Collect} from '../transforms';
import {extend, isString, stringValue} from 'vega-util';

function anchorExpr(startValue, endValue, centerValue) {
  return 'item.anchor==="' + Start + '"?' + startValue
    + ':item.anchor==="' + End + '"?' + endValue
    + ':' + centerValue;
}

// title text alignment
var alignExpr = anchorExpr(
  stringValue(Left), stringValue(Right), stringValue(Center)
);

// multiplication factor for anchor positioning
var multExpr = anchorExpr(
  '+(item.orient==="' + Right + '")',
  '+(item.orient!=="' + Left + '")',
  '0.5'
);

export default function(spec, scope) {
  spec = isString(spec) ? {text: spec} : spec;

  var config = scope.config.title,
      encode = extend({}, spec.encode),
      datum, dataRef, title;

  // single-element data source for group title
  datum = {
    orient: lookup('orient', spec, config)
  };
  dataRef = ref(scope.add(Collect(null, [datum])));

  // build title specification
  encode.name = spec.name;
  encode.interactive = spec.interactive;
  title = buildTitle(spec, config, encode, dataRef);
  if (spec.zindex) title.zindex = spec.zindex;

  // parse title specification
  return parseMark(title, scope);
}

function buildTitle(spec, config, userEncode, dataRef) {
  var zero = {value: 0},
      title = spec.text,
      orient = lookup('orient', spec, config),
      anchor = lookup('anchor', spec, config),
      sign = (orient === Left || orient === Top) ? -1 : 1,
      horizontal = (orient === Top || orient === Bottom),
      extent = {group: (horizontal ? 'width' : 'height')},
      encode = {}, enter, update, pos, opp;

  // title positioning along orientation axis
  pos = {field: extent, mult: {signal: multExpr}};

  // title baseline position
  opp = sign < 0 ? zero
    : horizontal ? {field: {group: 'height'}}
    : {field: {group: 'width'}};

  encode.enter = enter = {opacity: zero};
  addEncode(enter, 'fill',       lookup('fill', spec, config));
  addEncode(enter, 'font',       lookup('font', spec, config));
  addEncode(enter, 'fontSize',   lookup('fontSize', spec, config));
  addEncode(enter, 'fontWeight', lookup('fontWeight', spec, config));

  encode.exit = {opacity: zero};

  encode.update = update = {
    opacity: {value: 1},
    text:   encoder(title),
    anchor: encoder(anchor),
    orient: encoder(orient),
    extent: {field: extent},
    align:  {signal: alignExpr}
  };

  if (horizontal) {
    update.x = pos;
    update.y = opp;
    update.angle = zero;
    update.baseline = {value: orient === Top ? Bottom : Top};
  } else {
    update.x = opp;
    update.y = pos;
    update.angle = {value: sign * 90};
    update.baseline = {value: Bottom};
  }

  addEncode(update, 'offset',   lookup('offset', spec, config) || 0);
  addEncode(update, 'frame',    lookup('frame', spec, config));
  addEncode(update, 'angle',    lookup('angle', spec, config));
  addEncode(update, 'baseline', lookup('baseline', spec, config));
  addEncode(update, 'limit',    lookup('limit', spec, config));

  return guideMark(TextMark, TitleRole, spec.style || GroupTitleStyle,
                   null, dataRef, encode, userEncode);
}
