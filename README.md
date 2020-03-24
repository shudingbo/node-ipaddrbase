# node-ipaddrbase
IP addr base( 纯真 IP地址库 重置版 )，本库是一个IP地址库生成工具，根据 [纯真IP地址库的IP段](http://www.cz88.net/) ，重置生成新的IP地址库。


功能：
1. 支持分段多台机子一起从淘宝 IP地址库 查询 IP分段的地址信息； 
1. 支持 IP 地址 获取进度保存（因淘宝IP库 有 10qps的限制，或网络原因导致不能获取地址信息失败）；

# 配置说明：
``` javascript
    {
    "dataSrc": "data/qqwry.dat",    /// 纯真数据库文件
    "savePath": "out/qqwry.bin",   /// 地址信息保存文件
    "progressFile":"out/progress.txt",   /// 进度文件
    "noHandleRec":"out/nohandle.txt",   // 需要处理从淘宝获取位置信息的IP段
    "cn":"data/cn.txt",            // 中国行政区编码文件
    "noChina":"data/GeoLite2-City-Locations-zh-CN.csv",  // 各个国家编码配置文件
    "merge":{                      // 合并参数
        "out":"out/out.db",        // 合并文件存放位置
        "mode":"county",           // 合并模式
        "desc":"city|county|areaANDisp",  // 合并模式描述
        "template":"`insert into TIPAddrDB (sip,eip,sVal,eVal,country,country_id,region,region_id,city,city_id,county,county_id,isp,isp_id) VALUES('${loc.sip}','${loc.eip}','${loc.sVal}','${loc.eVal}','${loc.country}','${loc.country_id}','${loc.region}','${loc.region_id}','${loc.city}','${loc.city_id}','${loc.county}','${loc.county_id}','${loc.isp}','${loc.isp_id}')`"              /// 生成模板
    },
    "off"     : [ 0, 0.0001 ],       /// 记录获取段
    "freq"    :2000,           /// 从淘宝获取IP地址记录的频率（毫秒 ms）
    "progressDis" : 1,         /// 每获取成功？条，显示待处理剩余条数
    "isp":{                    /// isp 配置映射表
        "电信":100017,
        "铁通":100020
    }
}
```
# 生成
  根据纯真数据库生成地址库，生成的临时文件保存在 `cfg.savePath` 路径下。 执行命令如下：
```
node app.js
```
因为从淘宝地址库获取IP地址信息较慢（经常超时），所以可以通过 `cfg.off` 字段配置多台机子，同时获取相应偏移的记录。off 取值范围（0~1）。 例如不能从纯真数据库获得地址信息的记录有10000条，我们把这个放到2台机子来获取就可以对配置两台机子的 off字段分别为`[0,0.5],[0.5-1]`,两台机子会在 
`cfg.savePath` 路径下生成相应 .bin文件。都获取完成后，把bin文件复制到同一目录。合并即可生成。
# 合并
合并时，会对 `cfg.savePath` 路径下的所有 .bin 文件进行处理 执行命令如下：
``` javascript
node merge.js
```
* merge.mode
    * city，合并时，合并到市级别
    * county,合并数据到县级别（数据量最小）
    * areaANDisp,合并数据到县级别，且相邻但是isp不同不合并（数据量最大）

* merge.template 可以自定义合并时最终数据的记录的格式。整个字符串必须在 ``（ES6模板字符串）内。 变量必须用 **￥{}**包含。可自定义输出字段必须定义如下：
    
    变量名       | 解释
    ------------ | --------------
    loc.sip | 起始IP字符串模式
    loc.eip | 终止IP字符串模式
    loc.sVal | 起始IP(数值模式)
    loc.eVal | 终止IP(数值模式)
    loc.country |  国家名称
    loc.country_id | 国家代号
    loc.region | 省名称
    loc.region_id | 省代号
    loc.city |   市名称
    loc.city_id |  市代号
    loc.county |  县名称
    loc.county_id | 县代号
    loc.isp |    isp名称
    loc.isp_id | isp代号


 