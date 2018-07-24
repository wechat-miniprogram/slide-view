# slide-view

## 使用方法

1. 把slide-view引入到小程序项目中。

2. 在需要使用navigation-bar的页面page.json中添加navigation-bar自定义组件配置

```json
{
  "usingComponents": {
    "slide-view": "weapp-slide-view"
  }
}
```
3. WXML文件中引用navigation-bar
每一个slide-view提供两个<slot> 节点，用于承载组件引用时提供的子节点。left节点用于承载静止时slide-view所展示的节点，此节点的宽高应与传入slide-view的宽高相同。right节点用于承载滑动时所展示的节点，其宽度应于传入slide-view的slideWidth相同。

``` xml
<slide-view class="slide" width="320" height="100" slideWidth="200">
  <view slot="left">这里是插入到组内容</view>
  <view slot="right">
      <view>标为已读</view>
      <view>删除</view>
  </view>
</slide-view>
```
**slide-view的属性介绍如下：**

|属性名                  |类型         |默认值                    |是否必须    |说明                                       |
|------------------------|-------------|--------------------------|---------------|---------------------------|
|width                   |Number  | 显示屏幕的宽度    |是               |slide-view组件的宽度
|height                  |Number  |0                              |是               |slide-view组件的高度
|slideWidth          |Number  |0                              |是               |滑动展示区域的宽度（默认高度于slide-view相同）


