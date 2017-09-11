
'use strict';

const readline = require('readline');
const fs = require('fs');
const ipC = require('ip');



var cn = exports;
cn.parseCn = function( filename )
{
    return new Promise( (res,rej)=>{
        let recs = [];
        let readRl = readline.createInterface({
            input: fs.createReadStream( filename),
            historySize:0
          }); 
          readRl.on('line', (line)=>{  
              let detail = line.split(' ');
              recs.push( detail );
          });
        
          readRl.on('close', ()=>{
              let cns = genCns( recs );
              res( cns);
          });
    }); 
};


cn.parseNoChina = function( filename )
{
    return new Promise( (res,rej)=>{
        let recs = [];
        let nline = 0;
        let readRl = readline.createInterface({
            input: fs.createReadStream( filename),
            historySize:0
        });
        readRl.on('line', (line)=>{
            if( nline >0 ){
                let de = line.split(',');
                recs.push( [de[5],de[4],de[6],de[7],de[8],de[9]] );
            }

            nline++;
        });

        readRl.on('close', ()=>{
            let cns = genNoCns( recs );
            res( cns);
        });
    });
};

function genNoCns( recs )
{
    let len = recs.length;
    let setVal = new Set();

    for( let i=0;i<len; i++ ){
        if( recs[i][1] == "KR" ){
            recs[i][0] = "韩国";
        }else if(recs[i][1] == "AE"){
            recs[i][0] = "阿联酋";
        }else if(recs[i][1] == "KG"){
            recs[i][0] = "吉尔吉斯斯坦";
        }else if(recs[i][1] == "BA"){
            recs[i][0] = "波斯尼亚和黑塞哥维那";
        }

        setVal.add( `${recs[i][0]},${recs[i][1]}` );
    }

    let cns = [];
    cns.push( ["IANA","IANA"]);
    cns.push( ["IANA机构","IANA"]);
    cns.push( ["IANA保留地址","IANA"]);
    cns.push( ["欧盟","EU"]);
    for( let it of setVal )
    {
        cns.push(  it.split(",") );
    }

    return cns;
}


function genCns( recs )
{
    let cns = [];
    let len = recs.length;

    let curRegion = "";
    let curRegion_id = 0;
    let curCity   = "";
    let curCity_id = 0;

    for( let i=0;i<len;i++ )
    {
        let region = "-1";
        let region_id = parseInt(recs[i][0].substring(0,2));
        let city   = "-1";
        let city_id = parseInt(recs[i][0].substring(2,4));
        let county = "-1";
        let county_id = parseInt(recs[i][0].substring(4,6));

        if( city_id === 0 ){
            region = recs[i][1];
            curRegion = region;
            curRegion_id = recs[i][0];
            curCity = "-1";
            curCity_id = 0;
        }else if( county_id === 0 ){
            city = recs[i][1];
            curCity = city;
            curCity_id = recs[i][0];
            county_id = 0;
        }else{
            county = recs[i][1];
            county_id = recs[i][0];
        }
        
        //console.log(curRegion, curRegion_id, curCity,curCity_id,county,county_id);
        cns.push([ curRegion, curCity,county, curRegion_id,curCity_id,county_id]);
    }

    return cns;
}


/**
 * 
 * @param {*} Country 
 * @param {*} cns
 * @return 0，表示是大学需要重新匹配 
 */
function matchCity( Country, cns )
{
    var reg = /^(.*?)(?:省)(.*?)(?:市|州)((.*?)(?:县|区)){0,}/;
    let r = Country.match(reg);
    //r = '贵州省黔南州'.match(reg);
    //r = '贵州省黔南州荔波县'.match(reg);
    if( r !== null ){
        if( r[3] === undefined ){
            return [ r[1], r[2],""];
        }else{
            return [ r[1], r[2], r[4]];
        }
    }else{
        let regCityArea = /^(北京|重庆|上海|天津)[?:市]{0,1}(.*?)(?:区|县|坪|市)/;   // 匹配直辖市区
        //r = '北京市中国教育网'.match(regCityArea);
        //r = '重庆市荣昌区'.match(regCityArea);
        r = Country.match(regCityArea);
        if( r !== null ){
            return [ r[1], r[2],"" ];
        }

        let regSCityArea = /^(广西|宁夏|新疆|内蒙古|西藏|黑龙江)(.*?)(?:市|盟|地区|州|县)((.*?)(?:市|旗|县)){0,}/;   // 匹配自治区
        //r = '新疆阿克苏地区'.match(regSCityArea);
        //r = '新疆昌吉州'.match(regSCityArea);
        //r = '内蒙古兴安盟乌兰浩特市'.match(regSCityArea);
        //r = '内蒙古锡林郭勒盟苏尼特右旗'.match(regSCityArea);
        //r = '内蒙古乌兰察布市商都县'.match(regSCityArea);
        //r = '内蒙古锡林郭勒盟'.match(regSCityArea);

        r = Country.match(regSCityArea);
        if( r !== null ){
            if( r[3] === undefined ) {
                return [r[1], r[2], ""];
            }else{
                return [r[1], r[2], r[3]];
            }
        }

        let regProv = /(.*?)省/;   // 匹配省 
        r = Country.match(regProv); 
        if( r !== null ){
            return [ r[1], "",""];
        }

        let regCity = /^(北京|重庆|上海|天津)市$/;   // 匹配直辖市
        // r = '重庆市南川区'.match(regCity); 
        // r = '重庆市'.match(regCity); 
        // r = '北京市11川区'.match(regCity); 

        r = Country.match(regCity); 
        if( r !== null ){
            return [ r[1],"","" ];
        }


        let regSCity = /^(广西|宁夏|新疆|内蒙古|西藏|香港|台湾|澳门|香港特别行政区|澳门区)$/;   // 匹配自治区
        r = Country.match(regSCity); 
        if( r !== null ){
            return [ r[1],"","" ];
        }

        let regColl = /^(.*?)(大学|学院){1,1}/;   // 大学
        //r = '中央财经大学'.match(regColl); 
        //r = '长江大学东校区'.match(regColl); 
        // r = '内蒙古兴安盟乌兰浩特市'.match(regSCityArea); 
        // r = '内蒙古锡林郭勒盟苏尼特右旗'.match(regSCityArea);           
        r = Country.match(regColl); 
        if( r !== null ){
            return 0;
        }

        let regChina = /^(中国|甘肃|上海|江苏|湖北){1}/;   // 中国
        r = Country.match(regChina); 
        if( r !== null ){
            return [ r[1],"","" ];
        }

        let regCityCity = /^(.*?)市(.*?)市/;   // 中国
        r = '吉林市长春市'.match(regCityCity); 
        //r = '长江大学东校区'.match(regColl);
        r = Country.match(regCityCity); 
        if( r !== null ){
            return [ r[1], r[2],"" ];
        }

        return 1;
    }
}

function makeCNS( rec, info,cns,cfg )
{
    let si = cns.length;

    let chk1 =( info[0].length > 0 ) ;
    let chk2 = (( info[0].length > 0 ) && ( info[1].length > 0 ));
    let chk3 = (( info[0].length > 0 ) && ( info[1].length > 0 )&& ( info[2].length > 0 ));

    let cn2 = null;
    let cn1 = null;
    let cn3 = null;
    for( let i=0;i<si; i++ ){
        if( chk3 ){
            if(    (cns[i][0].indexOf( info[0]) !== -1  )
                && (cns[i][1].indexOf( info[1]) !== -1  )
                && (cns[i][2].indexOf( info[2]) !== -1  )
            )
            {
                cn3 = i;
                break;
            }
        }

        if( chk2 ){
            if(    (cns[i][0].indexOf( info[0]) !== -1  )
                && (cns[i][1].indexOf( info[1]) !== -1  )
            )
            {
                cn2 = i;
                if( chk3 === false ){
                    break;
                }
            }
        }

        if( chk1 ){
            if( cns[i][0].indexOf( info[0]) !== -1){
                cn1 = i;
                if( chk2 === false && chk3 === false ){
                    break;
                }
            }
        }
    }

    let cn = cn3;
    if( cn === null ){
        cn = cn2;
    }

    if( cn === null ){
        cn = cn1;
    }

    if( cn !== null ){
        let loc = {
            sip : ipC.fromLong(rec[0]),
            eip : ipC.fromLong(rec[1]),
            sVal: rec[0],
            eVal: rec[1],
            country:"CN",
            country_id:"中国",
            region: cns[cn][0],
            region_id:cns[cn][3],
            city:cns[cn][1],
            city_id:cns[cn][4],
            county:cns[cn][2],
            county_id:cns[cn][5],
            isp:"-1",
            isp_id:"-1"
        };
        writeRecByTemplate( loc, cfg);
        //writeTmpData( "ch.dat", [rec, info, cns[cn]]  );
    }else{
        //console.log("not find:", info);
        //writeTmpData( "no.dat", [rec,ipC.fromLong(rec[0]),ipC.fromLong(rec[1]),info]  );
        return false;
    }
    
}

function writeTmpData( fileName,val){
    let fd = fs.openSync( fileName, 'a+' );
    fs.writeSync( fd, val.toString() + "\n");
    fs.closeSync( fd);
}

function writeRecByTemplate( rec,cfg ){
    let fd = fs.openSync( cfg.savePath , 'a' );
    let loc = rec;
    let msg = eval( cfg.template ) + "\n";
    fs.writeSync( fd, msg);
    fs.closeSync( fd);
}

function makeNoChina(rec, cns,cfg)
{
    let si = cns.length;
    let no = false;
    for( let i=0;i<si;i++ )
    {
        let country = cns[i][0];
        if( cns[i][0].indexOf( rec[2] ) !== -1){
            no = true;
            let loc = {
                sip : ipC.fromLong(rec[0]),
                eip : ipC.fromLong(rec[1]),
                sVal: rec[0],
                eVal: rec[1],
                country:cns[i][0],
                country_id:cns[i][1],
                region:"-1",
                region_id:"-1",
                city:"-1",
                city_id:"-1",
                county:"-1",
                county_id:"-1",
                isp:"-1",
                isp_id:"-1"
            };
            writeRecByTemplate( loc, cfg );
            break;
        }
    }

    return no;
}


/** 生成国内数据 */
cn.makeCNData = function (czs, cns,noChina, cfg){
    let lenCZs = czs.length;
    let lenCNs = cns.length;

    let findNoChina = 0;
    let handleOK    = 0;
    let notHandle = [];
    for( let i=0;i<lenCZs;i++ )
    {
        let info = czs[i][2];
        let oper = czs[i][3];
        let val = matchCity( info );
        if( val === 0 )
        {
            writeTmpData(cfg.noHandleRec,[czs[i][0],czs[i][1]] );
            notHandle.push(czs[i]);
        }else if( val === 1 ){
            if( makeNoChina(czs[i],noChina,cfg ) === false)
            {
                writeTmpData(cfg.noHandleRec,[czs[i][0],czs[i][1]] );
                notHandle.push(czs[i]);
                findNoChina++;
            }else{
                handleOK++;
            }
        }
        else{
            if( makeCNS(czs[i],val, cns, cfg) === false ){
                writeTmpData(cfg.noHandleRec,[czs[i][0],czs[i][1]] );
                notHandle.push(czs[i]);
            }else{
                handleOK++;
            }
        }
    }

    console.log("not Handler cnt:", notHandle.length, handleOK,  notHandle.length+ handleOK   );
    console.log(" ---- over");

    return notHandle;
};
