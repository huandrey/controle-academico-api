const express = require("express");
const cheerio = require("cheerio");
const qs = require("qs");

const { default: axios } = require("axios");

const weekDays = {
  1: "Domingo",
  2: "Segunda",
  3: "Terça",
  4: "Quarta",
  5: "Quinta",
  6: "Sexta",
  7: "Sábado",
};
const app = express();
const PORT = process.env.PORT || 8000;
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Bem-vindo a nova API do Controle Acadêmico da UFCG!");
});
// const cheerio = require('cheerio');

app.post("/auth/student", async (req, res) => {
  const { identifier, password } = req.body;

  if (!identifier || !password) {
    res.status(400).json({
      status: 400,
      message: "Matrícula e senha são obrigatórios!",
    });
  }

  const data = qs.stringify({
    login: "120110573",
    senha: "puzzlefe0300",
    command: "AlunoLogin",
  });

  const {
    status,
    data: html = "",
    headers: { "set-cookie": cookieArray = [], expires, date },
  } = await axios.post(
    "https://pre.ufcg.edu.br:8443/ControleAcademicoOnline/Controlador",
    data
  );

  if (status !== 200 || !html || !cookieArray.length) {
    res.status(404).json({
      status: 404,
      message: "Erro ao tentar acessar o site da UFCG",
    });
  }

  const cookie = cookieArray[0].split(";")[0].split("=")[1];
  const $ = cheerio.load(html);

  const usrData = [];
  $("div.col-sm-9.col-xs-7").each((i, el) => {
    const [identifier = "", name = ""] = $(el).text().split("-");
    usrData.push([String(identifier).trim(), String(name).trim()]);
  });

  const user = {
    id: usrData[0][0],
    name: usrData[0][1],
    course: {
      id: usrData[1][0],
      name: usrData[1][1],
    },
  };

  res.status(200).json({
    message: "User authenticated",
    data: {
      ...user,
    },
    expires: date,
    cookie,
    token:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
  });
});

app.get("/student/classes", async (req, res) => {
  const { cookie } = req.query;

  // console.log(cookie);
  // const {
  //   status,
  //   data: html = "",
  // } = axios.get(
  //   "https://pre.ufcg.edu.br:8443/ControleAcademicoOnline/Controlador?command=AlunoTurmasListar?command=AlunoTurmasListar",
  //   {
  //     headers: {
  //       'Cookie': `JSESSIONID=${cookie};`,
  //     },
  //   }
  // );

  // console.log('eaiii')

  // console.log(html);



  let config = {
    url: 'https://pre.ufcg.edu.br:8443/ControleAcademicoOnline/Controlador?command=AlunoTurmasListar',
    headers: { 
      'Cookie': `JSESSIONID=${cookie};`, 
      'Content-Type': 'application/xhtml+xml; charset=utf-8',
    },
    charset: 'utf-8',
    responseEncoding: 'utf8'
  };

  axios.request(config)
  .then((response) => {
    console.log(response);
    const regex = /<meta\s+charset="ISO-8859-1">/;

    const html = response.data.replace(regex, '<meta charset="utf-8">');

    console.log(html);
    const $ = cheerio.load(html);
    let courses = [];
    $('tbody').find("tr").each((i, el) => {
      let course = [];
      $(el).find("td").each((j, el) => {
        course.push($(el).text().trim());
      });

      courses.push(course);
    });

    const coursesFormatted = courses.map(course => {
      const scheduleFormatted = course[4].split("\n");

      const schedule = scheduleFormatted.map((schedule) => {
        const [day, time, room] = schedule.split(" ");
        return {
          day: weekDays[day],
          time,
          room,
        };
      });

      return {
        period: course[0],
        id: course[1],
        name: course[2],
        classe: course[3],
        schedule,
      };
    })
    console.log(coursesFormatted);

    return res.status(200).json({
      message: "Classes retrieved",
      data: coursesFormatted,
    });
  })
  .catch((error) => {
    console.log(error);
  });
});

app.listen(PORT, () => {
  console.log(`Servidor está ouvindo na porta ${PORT}`);
});
