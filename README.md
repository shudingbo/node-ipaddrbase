# node-ipaddrbase
IP addr base( 纯真 IP地址库 重置版 )，本库是一个IP地址库生成工具，根据 [纯真IP地址库的IP段](http://www.cz88.net/) 和 [淘宝IP地址库的地址信息](http://ip.taobao.com/index.php)，重置生成新的IP地址库。

**淘宝IP地址库，拥有 更加规范的信息返回，更方便程序进行进一步的地理信息挖掘处理。**

功能：
1. 支持分段多台机子一起从淘宝 IP地址库 查询 IP分段的地址信息； 
1. 支持 IP 地址 获取进度保存（因淘宝IP库 有 10qps的限制，或网络原因导致不能获取地址信息失败）；

配置说明：
```
    {
    "dataSrc": "qqwry.dat",    /// 纯真数据库文件
    "savePath": "qqwry.txt",   /// 地址信息保存文件
    "progressFile":"progress.txt",   /// 进度文件
    "off"     : [ 0, 0.0001 ],       /// 记录获取段
    "freq"    :2000,           /// 从淘宝获取IP地址记录的频率（毫秒 ms）
    "progressDis" : 1,         /// 每获取成功？条，显示待处理剩余条数
    "template":""              /// 生成模板
}
```

