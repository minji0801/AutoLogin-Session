/** checkMssqlSession.js 가 있는 이유 :
 * 
 * 1. user.js
 * user_session 쿠키랑 현재 세션id가 같으면 welcome으로 이동하도록 되어있는데
 * db에 있는 세션id면 welcome으로 이동하도록 한다.
 * 
 * 2. index.js
 * 브라우저1 : 로그인되어있는 상태
 * 브라우저2 : 로그인하기 전
 * 
 * 개발자 도구를 통해 1의 쿠키를 2로 억지로 옮긴 후 1을 새로고침하면 로그인이 풀려야한다.
 * 이를 위해서 세션id가 db에 있는지 확인한다.
 */

var mssql = require('mssql');
var config = {
    // "user": "test",
    "user": "sa",
    "password": "qw12qw12",
    "server": "192.168.0.134",
    // "server": "192.168.35.17",
    "port": 1433,
    "database": "aTEST",
    // "timezone"  : 'utc',
    "options": {
        encrypt: false, // Use this if you're on Windows Azure 
        enableArithAbort: true
    }
}

async function index(user_session, req, res) {
    var result = await checkMssqlSession(user_session, req, res);
    console.log('result : ', result);

    if (result == 0) {
        res.render('welcome');
    } else {
        res.render('login');
    }
}

async function users(user_session, req, res) {
    var result = await checkMssqlSession(user_session, req, res);
    console.log('result : ', result);
    
    if (result == 0) {
        return res.json({ data: 'OK' });
    } else {
        return res.json({ data: 'NO' });
    }
}

// mssql session check
function checkMssqlSession(user_session, req, res) {

    try {
        return new Promise(function (resolve) {
            mssql.connect(config, function (err) {
        
                console.log('Connect');
                var request = new mssql.Request();
        
                var findSession = "SELECT * FROM session WHERE sessionId = '" + user_session + "'";
        
                request.query(findSession, function (err, result) {
        
                    if (result.rowsAffected[0] == 0) {
        
                        console.log('DB에 세션 없음!!');
                        res.clearCookie('user_session');
                        req.session.destroy(function () {
        
                            resolve(1);
                        })
        
                    } else {
        
                        console.log('DB에 세션 있음!!');
                        resolve(0);
                    }
                })
            })
        });
    } catch (err) {
        console.log(err);
    }
}


exports.index = index;
exports.users = users;