import Ember from 'ember';
import layout from './ember-list-template';

var decodeEachKey = Ember.__loader.require('ember-htmlbars/utils/decode-each-key')['default'];

/* Not sure what this is for?
class LayoutAttributes {
  constructor(index, x, y, width, height) {
    this.index = index;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }
}
*/

class Cell {
  constructor(key, item, index, style) {
    this.key = key;
    this.hidden = false;
    this.item = item;
    this.index = index;
    this.style = style;
  }
}

function formatStyle(pos, width, height) {
  return 'position: absolute; top: 0; left: 0; -webkit-transform: translate('+pos.x+'px, '+pos.y+'px); -moz-transform: translate('+pos.x+'px, '+pos.y+'px); transform: translate('+pos.x+'px, '+pos.y+'px); width: '+width+'px; height: '+height+'px;';
}

export default Ember.Component.extend({
  layout: layout,
  init() {
    this._super();
    // this.firstCell = undefined;
    // this.lastCell = undefined;
    // this.cellCount = undefined;
    this.offsetX = 0;
    this.offsetY = 0;
    this.width = 0;
    this.height = 0;
    this.contentElement = undefined;
    Ember.set(this, 'cells', Ember.A([]));
    this.cellMap = Object.create(null);
  },
  didInitAttrs() {
    this._super();
    this.buffer = this.attrs['buffer'] | 5;
    this.offsetX = this.attrs['offset-x'] | 0;
    this.offsetY = this.attrs['offset-y'] | 0;
    this.width = this.getAttr('width') | 0;
    this.height = this.getAttr('height') | 0;
  },

  didReceiveAttrs() {
    var calculateSize = false;
    // Reset cells when cell layout or items array changes
    var cellLayout = this.attrs['cell-layout'];
    var items = this.getAttr('items');
    var contentWidth = this.getAttr('width');
    var contentHeight = this.getAttr('height');

    if (!Array.isArray(items) && items.toArray)
    {
      items = items.toArray();
    }

    if (this.cellLayout !== cellLayout || this.items !== items) {
      this.items = items;
      this.cellLayout = cellLayout;
      calculateSize = true;
    }

    if (contentWidth !== this.width || contentHeight !== this.height) {
      this.width = contentWidth;
      this.height = contentHeight;
      this.calculateBounds();
      calculateSize = true;
    }

    if (calculateSize) {
      Ember.run.scheduleOnce('afterRender', this, 'calculateContentSize');
    }
  },

  didInsertElement() {
    this.contentElement = this.element.firstElementChild;
    this.calculateBounds();
    this.calculateContentSize();
    // content size
    this.initContentOffset();
    this.setupScroller();

    var component = this;
    function callback() {
      var element = component.element;
      if (element) {
        var offsetX = element.scrollLeft;
        var offsetY = element.scrollTop;

        if (offsetX !== component.offsetX || offsetY !== component.offsetY) {
          component.offsetX = offsetX;
          component.offsetY = offsetY;

          var index = component.cellLayout.indexAt(offsetX, offsetY, component.width, component.height);
          var count = component.cellLayout.count(offsetX, offsetY, component.width, component.height);
          if (index !== component.currentIndex || count !== component.currentCount) {
            component.currentIndex = index;
            component.currentCount = count;
            Ember.run(component, 'rerender');
          }
        }
      }
      requestAnimationFrame(callback);
    }
    callback();
  },
  setupScroller() {
    //this.element.addEventListener('scroll', Ember.run.bind(this, 'updateOffset'));
    // TODO save for teardown
  },
  // updateOffset() {
  //   if (this.element) {
  //     console.log('scroll');
  //     this.offsetX = this.element.scrollLeft;
  //     this.offsetY = this.element.scrollTop;
  //     this.rerender();
  //   }
  // },
  willRender() {
    var items = this.get('items');
    var itemsLength = items.length;
    this.cellLayout.length = itemsLength;

    var priorMap = this.cellMap;
    var cellMap = Object.create(null);

    var index = this.cellLayout.indexAt(this.offsetX, this.offsetY, this.width, this.height);
    var count = this.cellLayout.count(this.offsetX, this.offsetY, this.width, this.height);
    index = Math.max(index - this.buffer, 0);
    count = Math.min(count + this.buffer, itemsLength - index);
    var i, pos, width, height, style, itemIndex, itemKey, cell;

    var newItems = [];

    for (i=0; i<count; i++) {
      itemIndex = index+i;
      itemKey = decodeEachKey(items[itemIndex], '@identity');
      cell = priorMap[itemKey];
      if (cell) {
        pos = this.cellLayout.positionAt(itemIndex, this.width, this.height);
        width = this.cellLayout.widthAt(itemIndex, this.width, this.height);
        height = this.cellLayout.heightAt(itemIndex, this.width, this.height);
        style = formatStyle(pos, width, height);
        Ember.set(cell, 'style', style);
        Ember.set(cell, 'hidden', false);
        Ember.set(cell, 'key', itemKey);
        cellMap[itemKey] = cell;
      } else {
        newItems.push(itemIndex);
      }
    }

    for (i=0; i<this.cells.length; i++) {
      cell = this.cells[i];
      if (!cellMap[cell.key]) {
        if (newItems.length) {
          itemIndex = newItems.pop();
          itemKey = decodeEachKey(items[itemIndex], '@identity');
          pos = this.cellLayout.positionAt(itemIndex, this.width, this.height);
          width = this.cellLayout.widthAt(itemIndex, this.width, this.height);
          height = this.cellLayout.heightAt(itemIndex, this.width, this.height);
          style = formatStyle(pos, width, height);
          Ember.set(cell, 'style', style);
          Ember.set(cell, 'key', itemKey);
          Ember.set(cell, 'index', itemIndex);
          Ember.set(cell, 'item', items[itemIndex]);
          Ember.set(cell, 'hidden', false);
          cellMap[itemKey] = cell;
        } else {
          Ember.set(cell, 'hidden', true);
          Ember.set(cell, 'style', 'height: 0; display: none;');
        }
      }
    }

    for (i=0; i<newItems.length; i++) {
      itemIndex = newItems[i];
      itemKey = decodeEachKey(items[itemIndex], '@identity');
      pos = this.cellLayout.positionAt(itemIndex, this.width, this.height);
      width = this.cellLayout.widthAt(itemIndex, this.width, this.height);
      height = this.cellLayout.heightAt(itemIndex, this.width, this.height);
      style = formatStyle(pos, width, height);
      cell = new Cell(itemKey, items[itemIndex], itemIndex, style);
      cellMap[itemKey] = cell;
      this.cells.pushObject(cell);
    }
    this.cellMap = cellMap;
  },
  calculateBounds() {
    // TODO measure clientWidth and clientHeight vs offsetWidth and offsetHeight
    this.element.style.overflow = 'scroll';
    this.element.style.webkitOverflowScrolling = 'touch';
    this.element.style.webkitTransform = 'translate3d(0px, 0px, 0px) scale(1)';
    this.element.style.mozTransform = 'translate3d(0px, 0px, 0px) scale(1)';
    this.element.style.transform = 'translate3d(0px, 0px, 0px) scale(1)';
    this.element.style.position = 'relative';
    this.element.style.boxSizing = 'border-box';
    if (this.width > 0) {
      this.element.style.width = this.width + 'px';
    }
    if (this.height > 0) {
      this.element.style.height = this.height + 'px';
    }
  },
  calculateContentSize() {
    var contentWidth = this.cellLayout.contentWidth(this.width, this.height);
    var contentHeight = this.cellLayout.contentHeight(this.width, this.height);
    this.contentElement.style.width = contentWidth + 'px';
    this.contentElement.style.height = contentHeight + 'px';
  },
  initContentOffset() {
    if (this.offsetX > 0) {
      this.element.scrollLeft = this.offsetX;
    }
    if (this.offsetY > 0) {
      this.element.scrollTop = this.offsetY;
    }
  }
});
