// slide-view/slide-view.js
const _windowWidth = wx.getSystemInfoSync().windowWidth // (px)
Component({
  /**
   * 组件的属性列表
   */
  options: {
    multipleSlots: true,
  },
  properties: {
    //  组件显示区域的宽度 (rpx)
    width: {
      type: Number,
      value: 750 // 750rpx 即整屏宽
    },
    //  组件显示区域的高度 (rpx)
    height: {
      type: Number,
      value: 0,
    },
    threshold: Number, // (rpx),
    autoReset: Boolean
  },

  /**
   * 组件的初始数据
   */
  data: {
    viewWidth: _windowWidth, // (rpx)
    //  movable-view偏移量
    x: 0,
    //  movable-view是否可以出界
    out: false,
    slideWidth: 0
  },
  observers: {
    "autoReset": function(val) {
      val && this._expand && this.reset()
    }
  },

  /**
   * 组件的方法列表
   */
  ready() {
    this.updateRight()
  },
  methods: {
    updateRight() {
      // 获取右侧滑动显示区域的宽度
      const that = this
      const query = wx.createSelectorQuery().in(this)
      let ratio = 1
      query.select('.right').boundingClientRect(function (res) {
        ratio = 750 / _windowWidth
        that._slideWidth = res.width
        that._threshold = that.data.threshold ? that.data.threshold / ratio : res.width / 2
        that._viewWidth = that.data.width + res.width * ratio
        that.setData({
          viewWidth: that._viewWidth,
          slideWidth: res.width * ratio
        })
      }).exec()
    },
    reset() {
      this.setData({
        x: 0
      }, function() {
        this._expand = false
        this.triggerEvent('reset', this)
      })
    },
    end() {
      this.setData({
        x: -this._slideWidth
      }, function() {
        this._expand = true
        this.triggerEvent("end", this)
      })
    },
    onTouchStart(e) {
      this._startX = e.changedTouches[0].pageX
    },
    //  当滑动范围超过阈值自动完成剩余滑动
    onTouchEnd(e) {
      this._endX = e.changedTouches[0].pageX
      const {_endX, _startX, _threshold} = this
      if (_endX > _startX && this.data.out === false && this.data.x === 0) return
      if (_startX - _endX >= _threshold) {
        this.end()
      } else if (_startX - _endX < _threshold && _startX - _endX > 0) {
        this.reset()
      } else if (_endX - _startX >= _threshold) {
        this.reset()
      } else if (_endX - _startX < _threshold && _endX - _startX > 0) {
        this.end()
      }
    },
    //  根据滑动的范围设定是否允许movable-view出界
    onChange(e) {
      if (!this.data.out && e.detail.x < -this._threshold) {
        this.setData({
          out: true
        })
      } else if (this.data.out && e.detail.x >= -this._threshold) {
        this.setData({
          out: false
        })
      }
      this.triggerEvent('move', {
        target: this,
        event: e
      })
    }
  }
})
