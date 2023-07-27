include("Tektronix.js")

function KEI_PortInit(PortNumber)
{
	TEK_PortInit(PortNumber, 9600);
}

function KEI_Reset()
{
	TEK_Send("*RST");
}

function KEI_ZeroCorrect(State)
{
	if(State)
	{
		TEK_Send("SYST:ZCH ON");
		//
		TEK_Send("CURR:RANG 2E-9");
		TEK_Send("INIT");
		TEK_Send("SYST:ZCOR:ACQ");
		//
		TEK_Send("SYST:ZCH OFF");
		TEK_Send("SYST:ZCOR ON");
	}
	else
		TEK_Send("SYST:ZCH OFF");
}

function KEI_Measure()
{
	return parseFloat(TEK_Exec("READ?"));
}

function KEI_Read()
{
	return parseFloat(TEK_Exec("SENS:DATA?"));
}

function KEI_SetRange(Range)
{
	TEK_Send("CURR:RANG " + Range);
}

function KEI_SetRate(Rate)
{
	TEK_Send("CURR:NPLC " + Rate);
}

function KEI_MedianFilterControl(Rank, State)
{
	// Rank = 1..5
	
	if(Rank < 1 || Rank > 5)
		Rank = 1;
	
	if(State)
	{
		TEK_Send("MED:RANK " + Rank);
		TEK_Send("MED ON");
	}
	else
		TEK_Send("MED OFF");
}

function KEI_Average(Count, NoiseTol, State)
{
	// Count = 2..100 (Specify filter count)
	// NoiseTol = 0..105 (Specify noise tolerance (in %))
	
	if(Count < 1 || Count > 100)
		Count = 1;
	if(NoiseTol < 0 || NoiseTol > 105)
		NoiseTol = 0;
	
	if(State)
	{
		TEK_Send("AVER:COUN " + Count);
		TEK_Send("AVER:TCON MOV");
		TEK_Send("AVER:ADV:NTOL " + NoiseTol);
		TEK_Send("AVER:ADV ON");
		TEK_Send("AVER ON");
	}
	else
	{
		TEK_Send("AVER:ADV OFF");
		TEK_Send("AVER OFF");
	}
}

function KEI_SetCorrection(M, B)
{
	TEK_Send("CALC:FORM MXB");
	TEK_Send("CALC:KMAT:MMF " + M);
	TEK_Send("CALC:KMAT:MBF " + B);
	TEK_Send("CALC:STAT ON");
	TEK_Send("INIT");
}

function KEI_MeasureCorrectedValue()
{
	return parseFloat(TEK_Exec("CALC:DATA?"));
}

function KEI_SetTLinkInputLine(Line)
{
	TEK_Send("TRIG:ASYN:ILIN " + Line);
}

function KEI_SetTLinkOutputLine(Line)
{
	TEK_Send("TRIG:ASYN:OLIN " + Line);
}

function KEI_SetOutputTrigType(Type)
{
	if(Type)
		TEK_Send("ARM:ASYN:OUTP TRIG");
	else
		TEK_Send("TRIG:ASYN:OUTP SENS");
}

function KEI_SetExtTrigger(TriggerCounter)
{
	TEK_Send("TRIG:DEL 0");
	TEK_Send("TRIG:SOUR TLINk");
	TEK_Send("TRIG:COUN " + TriggerCounter);
}

function KEI_InitTrigWaiting()
{
	TEK_Send("INIT");
}

function KEI_BufferConfig(N)
{
	KEI_Reset();
	KEI_ZeroCorrect(true);
	KEI_SetExtTrigger(N);
	KEI_SetTLinkInputLine(2);
	KEI_SetOutputTrigType(0);
	TEK_Send("NPLC 0.01");
	KEI_SetRange(2e-3);
	TEK_Send("SYST:ZCH OFF");
	TEK_Send("SYST:AZER:STAT OFF");
	
	TEK_Send("*CLS");
	
	TEK_Send("TRAC:POIN " + N);
	TEK_Send("TRAC:CLE");
	TEK_Send("TRAC:FEED:CONT NEXT");
	
	TEK_Send("STAT:MEAS:ENAB 512");
	TEK_Send("*SRE 1");
	
	p("OPC = " + TEK_Exec("*OPC?"));
}

function KEI_TestBuffer(N, Width)
{
	var Data = [];
	
	KEI_InitTrigWaiting();
	sleep(50);
	dev.w(130,Width);
	dev.w(128,N);
	sleep(1000);
	
	Data = TEK_Exec("TRAC:DATA?");
	
	TEK_Send("CALC3:FORM MEAN");
	p("Imean = " + parseFloat(TEK_Exec("CALC3:DATA?")));
	
	TEK_Send("CALC3:FORM PKPK");
	p("Ipk-pk = " + parseFloat(TEK_Exec("CALC3:DATA?")));
	
	TEK_Send("CALC3:FORM MIN");
	p("Imin = " + parseFloat(TEK_Exec("CALC3:DATA?")));
	
	TEK_Send("CALC3:FORM MAX");
	p("Imax = " + parseFloat(TEK_Exec("CALC3:DATA?")));
	
	TEK_Send("CALC3:FORM SDEV");
	p("Idev = " + parseFloat(TEK_Exec("CALC3:DATA?")));
	
	//save("Keithley.csv", Data);
}
