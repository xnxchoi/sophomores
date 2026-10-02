
	export const mailAuthString=(deviceType:"ios"|"android")=>{
	return `${process.env.MAIL_AUTH}${deviceType==='ios'?";":"?"}body=인증 메시지`
	}