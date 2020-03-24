
'use strict';

const readline = require('readline');
const fs = require('fs');
const ipC = require('ip');
const co = require('co');
const http = require('http');
const querystring=require('querystring');
const iconv = require('iconv-lite');
const pathC = require('path');

const getLoc = exports;

const _timerGet = null;

function timeout(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
}

let g_rec = [];
getLoc.getRecsLocation = function( cfg )
{
    co(function* () {
        let recsT = yield loadNoHandle( cfg.noHandleRec );
        //
        //console.log( recsT );
        let nRec = recsT.length;
        let sIdx = Math.ceil( nRec * cfg.off[0]);
        let eIdx = Math.ceil( nRec * cfg.off[1]);
        if( cfg.off[1] === 1  ){
            eIdx = nRec;
        }

        let recSIP = [];
        let recEIP = [];

        for( let i=sIdx;i<eIdx;i++ ){
            recSIP.push( recsT[i][0] );
            recEIP.push( recsT[i][1] );
        }

        let progress = load_progress( cfg );
        let recs = [];
        let recDet = recSIP.minus( progress );

        if( progress.length === 0 ){
            let fileName = pathC.basename( cfg.savePath,'.bin' );
            fileName += "_" + cfg.off[0] + ".bin";
            fileName = pathC.join( pathC.dirname( cfg.savePath ), fileName  );
            let fd = fs.openSync( fileName, 'w' );
            fs.closeSync( fd );
        }

        let i=0,j=0;
        for( i=0;i<recDet.length;i++)
        {
            for( j=0;j<recSIP.length;j++ ){
                if( recSIP[j] == recDet[i] ){
                    recs.push( [ipC.fromLong(recSIP[j]), ipC.fromLong(recEIP[j])]);
                    break;
                }
            }
        }

        g_rec = recs;
        console.log("--- 解析完成，开始获取记录信息, 数量：", g_rec.length);

    }).then(function (value) {
        (async ()=>{
            while( g_rec.length > 0 ){
                let rec = g_rec.shift();
                await get_locs( rec,cfg );
                await timeout( cfg.freq );
            };

            console.log( "get all OK!" );
        })();
    }, function (err) {
        console.error(err.stack);
    });
};



function httpGet(host,path,encoding='utf-8'){
    return new Promise((resolve, reject)=>{
        const options = {
            host,
            path,
            method: 'GET'
        };
    
        var request_timer = null,req = null;
    
        request_timer = setTimeout(function() {
            req.abort();
            //console.log('Request Timeout.');
        }, 5000);
    
        req = http.request(options, (res) => {
            clearTimeout(request_timer);
    
            let response_timer = setTimeout(function() {
                res.destroy();
                console.log('Response Timeout.');
            }, 1000);
    
            let chunks = [];
            res.on('data', (chunk) => {
                chunks.push(chunk);
            });
            res.on('end', () => {
                clearTimeout(response_timer);
                let decodedBody = iconv.decode(Buffer.concat(chunks), encoding);
                resolve(decodedBody)
            });
        });
    
        req.on('error', (e) => {
            clearTimeout(request_timer);
            reject( e.message );
        });
    
        req.end();
    });
    
};


async function get_loc_pconline(ip){
    let host = 'whois.pconline.com.cn';
    let path = `/ipJson.jsp?ip=${ip}&json=true`;

    let ret = await httpGet( host ,path ,'gb2312');
    return ret;
}

async function get_loc_ipapi(ip){
    let host = 'ip-api.com';
    let path = `/json/${ip}?lang=zh-CN`;

    let ret = await httpGet( host ,path ,'utf-8');
    return ret;
}


function writeRecord( rec, loc,cfg  )
{
    if( loc.country === ''  ) { loc.country = '-1'; }
    if( loc.country_id === ''  ) { loc.country_id = '-1'; }
    if( loc.region === ''  ) { loc.region = '-1'; }
    if( loc.region_id === ''  ) { loc.region_id = '-1'; }
    if( loc.city === ''  ) { loc.city = '-1'; }
    if( loc.city_id === ''  ) { loc.city_id = '-1'; }
    if( loc.county === ''  ) { loc.county = '-1'; }
    if( loc.county_id === ''  ) { loc.county_id = '-1'; }
    if( loc.isp === ''  ) { loc.isp = '-1'; }
    if( loc.isp_id === ''  ) { loc.isp_id = '-1'; }
    //console.log( loc );
    loc.sip = rec[0];
    loc.eip = rec[1];
    loc.sVal = ipC.toLong( rec[0] );
    loc.eVal = ipC.toLong( rec[1] );

    let fileName = pathC.basename( cfg.savePath,'.bin' );
    fileName += "_" + cfg.off[0] + ".bin";
    fileName = pathC.join( pathC.dirname( cfg.savePath ), fileName  );

    let fd = fs.openSync( fileName , 'a+' );
    let sIP = ipC.toLong( rec[0] );
    let eIP = ipC.toLong( rec[1] );
    let msg = `${rec[0]} ${rec[1]} ${sIP} ${eIP} ${loc.country} ${loc.country_id} ${loc.region} ${loc.region_id} ${loc.city} ${loc.city_id} ${loc.county} ${loc.county_id} ${loc.isp} ${loc.isp_id}\n`;
    fs.writeSync( fd, msg);
    fs.closeSync( fd);

    write_progress( loc.sVal,cfg );
}



async function get_locs( rec,cfg ){

    try{
        if( g_rec.length % cfg.progressDis === 0 ){
            console.log( g_rec.length );
        }
        
        let info = await get_ipInfo(rec);
        writeRecord( rec, info,cfg );
    }catch(e){
        console.log( e,rec );
        g_rec.push( rec );
        await timeout( cfg.freq );
    }
}

/**
 * 
 * @param {string} isp 
 */
function getIspInfo(isp){
    const ispInfo = {
        '0': {isp:'移动', isp_id:'100025'},
        '1': {isp:'电信', isp_id:'100017'},
        '2': {isp:'联通', isp_id:'100026'},
        '3': {isp:'中移铁通', isp_id:'100020'},
    }


    if( isp.indexOf('China Mobile communications') !== -1){
        return ispInfo['0'];
    }else if( isp.indexOf('Chinanet') !== -1){
        return ispInfo['1'];
    }else if( isp.indexOf('China169') !== -1){
        return ispInfo['2'];
    }else if( isp.indexOf('TieTong') !== -1){
        return ispInfo['3'];
    }

    return {isp:'-1', isp_id:'-1'};
}


async function get_ipInfo( rec ){
    let po = await get_loc_pconline( rec[0] );
    let ipapi = await get_loc_ipapi( rec[0] );

    let po1 = JSON.parse( po );
    let ipapi1 = JSON.parse( ipapi );

    let ret = {};
    ret.country = ipapi1.countryCode;
    ret.country_id = ipapi1.country;
    ret.region = po1.pro;
    ret.region_id = po1.proCode;
    ret.city = po1.city;
    ret.city_id = po1.cityCode;
    ret.county = po1.region;
    ret.county_id = po1.regionCode;
    
    let isp = getIspInfo( ipapi1.isp );
    ret.isp = isp.isp;
    ret.isp_id = isp.isp_id;

    return ret;
}


/** 读取 需要从 http获取信息的记录 */
function loadNoHandle( filename ){
    return new Promise( (res,rej)=>{
        let recs = [];
        let readRl = readline.createInterface({
            input: fs.createReadStream( filename),
            historySize:0
        });
        readRl.on('line', (line)=>{
            let de = line.split(',');
            recs.push( [de[0],de[1]]);
        });

        readRl.on('close', ()=>{
            res( recs);
        });
    });
}

/** 读取进度
 * @return 返回已经成功获取的记录的起始IP地址
 */
function load_progress( cfg )
{
    try{
        let ret = fs.readFileSync(cfg.progressFile);
        //console.log( ret );
        return ret.toString().split('\n');
    }catch( e ){
        return [];
    }
}


/** 写进度
 * @param recIdx 记录成功获取信息的起始IP地址
 */
function write_progress( recSIP,cfg )
{
    let fd = fs.openSync( cfg.progressFile , 'a' );
    fs.writeSync( fd, `${recSIP}\n`);
    fs.closeSync( fd);
}
//2个集合的差集 在arr不存在
Array.prototype.minus = function (arr) {
    let result = new Array();
    let obj = {};
    for (let i = 0; i < arr.length; i++) {
        obj[arr[i]] = 1;
    }
    for (let j = 0; j < this.length; j++) {
        if (!obj[this[j]])
        {
            obj[this[j]] = 1;
            result.push(this[j]);
        }
    }
    return result;
};