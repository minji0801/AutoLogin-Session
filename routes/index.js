var express = require('express');
var router = express.Router();
const mssql = require('mssql');
/* GET home page. */

/* 이 부분을 추가해줘야 */
var passport = require('passport');
router.use(passport.initialize());
router.use(passport.session());
/* req.isAuthenticated()를 사용할 수 있다. */

var checkMssqlSession = require('./checkMssqlSession');
const config = {
    // "user"      : "sa",
    // "password"  : "qw12qw12)",
    // "server"    : "192.168.0.122",
    // "port"      : 1433,
    // "database"  : "aTEST",
    // "timezone"  : 'utc',
    // "options"   : {
    //     "encrypt" : false
    // }
    // "user": "test",
    "user": "sa",
    "password": "qw12qw12",
    //"server"    : "192.168.0.135",
    // "server": "192.168.137.1",
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

router.get('/', function (req, res, next) {
    res.render('login');
})

router.get('/chat', function (req, res, next) {
    res.render('chat');
})

// router.get('/', function(req, res, next) {
//     res.render('test', { title: 'Express' });
// });

router.get('/test', function (req, res, next) {
    console.log('good');
    res.render('test');
});

router.get('/mail', function (req, res, next) {
    console.log('get mail');
    mssql.connect(config, function (err) {

        var request = new mssql.Request();
        let query = "EXEC p__EML";
        request.query(query, function (err, result) {
            res.render('apps_mailbox', { data: result.recordset });
        })
    });
});

router.get('/sendMail', function (req, res, next) {
    console.log('send mail');
    // mssql.connect(config, function (err) {

    //     var request = new mssql.Request();
    //     let query = "EXEC p__EML";
    //     request.query(query,function(err, result){

    //     })
    // });

    res.render('send_mail');
});

router.get('/viewMail', function (req, res, next) {
    console.log('view mail');

    res.render('view_mail');
});

router.get('/contentMail', function (req, res, next) {
    console.log('content mail');

    res.render('content_mail');
});

router.get('/signup', function (req, res, next) {
    console.log('sign up');

    res.render('signup');
});

router.get('/login', function (req, res, next) {
    console.log('login');
    console.log(req.protocol);
    console.log(req.secure);

    res.render('login');
});

router.get('/welcome', function (req, res, next) {
    console.log('welcome');
    console.log('welcome 로그인 상태 : ', req.isAuthenticated());

    if (req.isAuthenticated()) {

        // 세션아이디가 DB에 없어도 세션에 사용자 정보가 있으면 로그인 한 것으로 간주한다.
        // 억지로 쿠키를 옮기면 기존 화면은 새로고침하면 로그인으로 돌아가야한다.(중복로그인)

        var user_session = req.cookies.user_session;
        checkMssqlSession.index(user_session, req, res);

    } else {

        res.render('login');

    }

});

//리치 에디트 글 화면 이후 글 작성으로 넘어갈 화면임
// router.get('/editor',function(req,res,next){
//     console.log('listen editor!!');
//     res.render('editor');
// })


//작성한 글 불러오기
router.get('/editor/:number', function (req, res) {

    try {
        let board_number = req.params.number;
        mssql.connect(config, function (err) {

            var request = new mssql.Request();
            let query = "SELECT C_i, C_Text FROM tC WHERE C_i = " + board_number + ";"
            request.query(query, function (err, result) {
                // res.json({data : result.recordset});
                console.log('testjson', result.recordset[0]);
                res.render('editor', { data: result.recordset[0] })
                // res.render('editor');
            })
        });
    } catch (err) {
        console.log('error fire', err)
    }
})


// //ckeditor
// router.get('/ckeditor',function(req,res,next){
//     console.log('ckeditor!');
//     res.render('ckeditor');
// })

router.post('/api/SaveDocument', function (req, res) {
    var fileAsBase64 = req.body.base64;
    var fileName = req.body.fileName;
    var format = req.body.format;
    var reason = req.body.reason;
    console.log('nice nice');
    fs.writeFile(`${fileName}.${getDocumentExtension(format)}`, fileAsBase64, 'base64', (err) => { });
    res.sendStatus(200);
});


function getDocumentExtension(format) {
    switch (format) {
        case '4': return "docx";
        case '2': return "rtf";
        case '1': return "txt";
    }
    return "docx";
}


////////  DevExtreme

//웹 에디터
// router.get('/dev',function(req,res){
//   res.render('dev_test');
// })


//드래그 테이블
router.get('/drag', function (req, res, next) {
    console.log('ckeditor!');
    res.render('board_drag');
})

module.exports = router;
