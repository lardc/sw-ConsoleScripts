function E3632A_PortInit(PortNumber)
{
	if (typeof devTek !== 'undefined')
		devTek.Disconnect();
	else
		devTek = cfg.CreateDevice();
	
	if (typeof BaudeRate === 'undefined')
		BaudeRate = 9600;
	
	devTek.Connect(PortNumber, BaudeRate);
}

function E3632A_Send(Request)
{
	devTek.ss(Request);
	sleep(300);
}

function E3632A_OutputON()
{
	devTek.ss("OUTput ON");
}

function E3632A_OutputOFF()
{
	devTek.ss("OUTput OFF");
}

function E3632A_SetVoltage(Voltage)
{
	devTek.ss("VOLT " + Voltage);
}

function E3632A_ProtectionCurrent(Current)
{
	devTek.ss("CURRent:PROTection " + Current);
}

