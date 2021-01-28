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

// 중복로그인 체크_이메일
async function email(req, res) {
    var dup = await checkDuplicateSession(req.sessionID, req.session, req.user.email, req.user.provider);
    console.log('duplicateLogin : ', dup);

    if (dup == 1) {

        res.cookie("user_session", req.sessionID, {
            httpOnly: true,
            secure: true,
            maxAge: 31536000000 // 1년
        });

        return res.json({ data: 'OK' });

    } else { }
}

// 중복로그인 체크_소셜
async function social(req, res) {
    var dup = await checkDuplicateSession(req.sessionID, req.session, req.user.email, req.user.provider);
    console.log('duplicateLogin : ', dup);

    if (dup == 1) {

        res.cookie("user_session", req.sessionID, {
            httpOnly: true,
            secure: true,
            maxAge: 31536000000 // 1년
        });

        return res.redirect('/welcome');

    } else { }
}

function checkDuplicateSession(sessionID, session, email, provider) {

    try {
        return new Promise(function (resolve) {
            mssql.connect(config, function (err) {

                console.log('Connect');
                var request = new mssql.Request();

                var insertSession = "INSERT INTO session VALUES ('" + sessionID + "', '" + JSON.stringify(session) + "', '" + email + "', '" + provider + "', GETDATE())";
                var checkSession = "SELECT sessionId FROM session WHERE sessionId != '" + sessionID + "'AND email = '" + email + "' AND provider = '" + provider + "'";

                request.query(insertSession, function (err, result) {

                    // session 테이블에 똑같은 email, provider를 지닌 데이터 있나 확인
                    request.query(checkSession, function (err, result) {

                        if (result.rowsAffected[0] == 0) {

                            console.log('중복로그인 없음!!');
                            resolve(1);

                        } else {

                            console.log('중복로그인 있음!!');

                            var sessionId = result.recordset[0].sessionId
                            var deleteSession = "DELETE session WHERE sessionId = '" + sessionId + "'";

                            // 중복 세션(이전) 삭제
                            request.query(deleteSession, function (err, result) {

                                resolve(1);
                            })
                        }
                    })
                })
            });
        });
    } catch (err) {
        console.log(err);
    }
}

exports.email = email;
exports.social = social;