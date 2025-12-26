function E3632A_PortInit(PortNumber)
{
	if (typeof devTek !== 'undefined')
		devTek.Disconnect();
	else
		devTek = cfg.CreateDevice();
	
	if (typeof BaudeRate === 'undefined')
		BaudeRate = 9600;
	
	devTek.Connect(PortNumber, BaudeRate, true);
}

function E3632A_Send(Request)
{
	devTek.ss(Request);
	sleep(300);
}

function E3632A_Exec(Request)
{
	var r = devTek.sswr(Request);
	return r.join("").replace(/(\n)/, "");
}

function E3632A_OutputON()
{
	E3632A_Send("OUTput ON");
}

function E3632A_OutputOFF()
{
	E3632A_SetVoltage(0);
	E3632A_Send("OUTput OFF");
}

function E3632A_SetVoltage(Voltage)
{
	E3632A_Send("VOLT " + Voltage);
}

function E3632A_ProtectionCurrent(Current)
{
	E3632A_Send("CURRent:PROTection " + Current);
}

