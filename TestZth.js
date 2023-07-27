include("PrintStatus.js")
include("Sic_GetData.js")
include("Tektronix.js")

HeatingCurrentLess2mS	= 300;
HeatingCurrentLess10mS	= 200;
HeatingCurrentAbove10mS	= 100;
GateCurrent 			= 1000;		// Gate current, in mA
MeasuringCurrent 		= 1000;		// Measuring current, in mA
MeasurementDelay		= 750;		// Delay before measurement, in us
DUT_Type				= 1;		// 0 - thyristor, 1 - IGBT;
Tmax					= 850;
//
PrintProcess			= 1;


var Zth_chMeasureI, Zth_chMeasureU;

function Zth_Start(Mode, PulseWidthMin, PulseWidthMax, Delay, Start)
{
	if(Start)
	{
		dev.w(128, Mode);
		dev.w(129, DUT_Type);
		dev.w(131, PulseWidthMin / 100);
		dev.w(139, GateCurrent);
		dev.w(140, MeasuringCurrent);
		dev.w(141, MeasurementDelay);
		
		dev.w(136, HeatingCurrentLess2mS);
		dev.w(137, HeatingCurrentLess10mS);
		dev.w(138, HeatingCurrentAbove10mS);
		dev.w(142, Tmax);
		
		if(Mode == 1)
			dev.w(134, Delay);
		else
			dev.w(135, Delay / 100);
		
		
		Zth_PulseWidthSet(PulseWidthMax);
		
		if(dev.r(192) == 4)
		{
			dev.c(100);
			p("Start process...");
		}
		else
		{
			if(dev.r(192) == 5)
			{
				dev.c(103);
				p("Update parameters");
			}
		}
		
		if(PrintProcess)
			Zth_InProcess();
	}
	else
	{
		if(dev.r(192) == 5)
		{
			dev.c(101);
			p("Stop process");
		}
	}
}
//------------------------------

function Zth_InProcess()
{
	while(1)
	{
		sleep(1000);
		p("Im,    mA: " + dev.r(206) / 10);
		p("Ih,     A: " + dev.r(201) / 10);
		p("P,      W: " + (dev.r(202) / 10));
		p("Ps,     W: " + (dev.r(204) / 10));
		p("Tcase1, C: " + dev.r(207) / 10);
		p("Tcool1, C: " + dev.r(209) / 10);
		p("Udut,   V: " + dev.r(200) / 10000);
		p("TSP,    V: " + dev.r(211) / 10000);
		p("-------------------");
		
		if(anykey())
		{
			key = readkey();
			
			if(key == "s")
			{
				p("Stop heating");
				dev.c(102);
			}
			
			if(key == "f")
			{
				p("Stop process");
				dev.c(101);
				return;
			}
			
			if(key == "e")
			{
				p("Exit");
				return;
			}
		}
		
		if(dev.r(192) == 4)
		{
			p("Done");
			return;
		}
		
		if(dev.r(192) == 1)
		{
			PrintStatus();
			return;
		}
	}
}
//------------------------------

function Zth_Im(Current, PulseWidth_us)
{
	var Sleep;
	
	Sleep = PulseWidth_us / 1e6;
	if(Sleep < 1)
		Sleep = 1;
	
	Zth_PulseWidthSet(PulseWidth_us);
	
	dev.w(140, Current);
	dev.w(128, 4);
	dev.c(50);
	
	if(PrintProcess)
	{
		p("Process...");
		
		for(i = 0; i < Sleep; i++)
		{
			sleep(1000);
			p("Im, mA: " + dev.r(206) / 10);
			
			if(anykey())
			{
				dev.c(101);
				return;
			}
			
			if(dev.r(192) != 5)
				return;
		}
	}
}
//------------------------------

function Zth_Gate(DUT_Type, Value, PulseWidth_us)
{	
	dev.w(128, 6);
	dev.w(129, DUT_Type);
	
	if(DUT_Type)
	{
		if(Value)
			dev.w(143, 1);
		else
			dev.w(143, 0);
	}
	else
		dev.w(139, Value);
	
	Zth_PulseWidthSet(PulseWidth_us);

	dev.c(52);
}
//------------------------------

function Zth_Ih(Current, PulseWidth_us)
{
	var Sleep;
	
	Sleep = PulseWidth_us / 1e6;
	if(Sleep < 1)
		Sleep = 1;
	
	if(PulseWidth_us <= 2000)
		dev.w(136, Current);
	else
		if(PulseWidth_us > 10000)
			dev.w(138, Current);
		else
			dev.w(137, Current);
	
	Zth_PulseWidthSet(PulseWidth_us);
	
	dev.w(128, 5);
	dev.c(51);
	p("Process...");
	
	for(i = 0; i < Sleep; i++)
	{		
		var ActualPower = dev.r(202) + dev.r(203) / 100;
		var ActualPowerTarget = dev.r(204) + dev.r(205) / 100;
		
		p("#" + i);
		p("U,  V: " + dev.r(200) / 1000);
		p("I,  A: " + dev.r(201) / 10);
		p("P,  W: " + ActualPower);
		p("Pt, W: " + ActualPowerTarget);
		p("----------------");
		p("");
		
		if(anykey())
		{
			dev.c(101);
			return;
		}
		
		if(dev.r(192) != 5)
			return;
		
		sleep(1000);
	}
}
//------------------------------

function Zth_Tall()
{
	p("Tcase1, C: " + Zth_Tcase1());
	p("Tcool1, C: " + Zth_Tcool1());
	p("Tcase2, C: " + Zth_Tcase2());
	p("Tcool2, C: " + Zth_Tcool2());
}

function Zth_Tcase1()
{
	dev.c(13);
	return (dev.r(155) + dev.r(156) / 10);
}
//------------------------------

function Zth_Tcool1()
{
	dev.c(15);
	return (dev.r(155) + dev.r(156) / 10);
}
//------------------------------

function Zth_Tcase2()
{
	dev.c(14);
	return (dev.r(155) + dev.r(156) / 10);
}
//------------------------------

function Zth_Tcool2()
{
	dev.c(16);
	return (dev.r(155) + dev.r(156) / 10);
}
//------------------------------

function Zth_PulseWidthSet(PulseWidth_us)
{
	var PulseWidth_L, PulseWidth_H;
	
	PulseWidth_us = PulseWidth_us / 100;
	PulseWidth_L = PulseWidth_us & 0xFFFF;
	PulseWidth_H = (PulseWidth_us >> 16) & 0xFFFF;
	
	dev.w(132, PulseWidth_L);
	dev.w(133, PulseWidth_H);
}
//------------------------------

function CAL_Init(portDevice, portTek, channelMeasureI, channelMeasureU)
{
	if (channelMeasureI < 1 || channelMeasureI > 4 || channelMeasureU < 1 || channelMeasureU > 4)
	{
		print("Wrong channel numbers");
		return;
	}

	// Copy channel information
	Zth_chMeasureI = channelMeasureI;
	Zth_chMeasureU = channelMeasureU;

	// Init device port
	dev.Disconnect();
	dev.Connect(portDevice);

	// Init Tektronix port
	TEK_PortInit(portTek);
	
	// Tektronix init
	for (var i = 1; i <= 4; i++)
	{
		if (i == channelMeasureI || i == channelMeasureU)
			TEK_ChannelOn(i);
		else
			TEK_ChannelOff(i);
	}
}
//--------------------

function Zth_TestPulseSquareness(TurnOnTime, Current, PulseWidth)
{
	var CurrentWaveform = [];
	var VoltageWaveform = [];
	var PowerWaveform = [];
	var PowerWaveformRef = [];
	var Error, RefPowerPulse, ZthPowerPulse, AvgPowerDUT, AvgCounter;
	var StartIndex, StopIndex, TimeCounter;
	
	ZthPowerPulse = 0;
	AvgPowerDUT = 0;
	AvgCounter = 0;
	TimeCounter = 0;
	StartIndex = 0;
	
	// Generate pulse
	Zth_Ih(Current, PulseWidth);
	
	// Load waveform from scope
	CurrentWaveform = SiC_GD_Filter(SiC_GD_GetChannelCurve(Zth_chMeasureI), 1000);
	VoltageWaveform = SiC_GD_Filter(SiC_GD_GetChannelCurve(Zth_chMeasureU), 1);
	
	// Calculate power dissapation
	for(i = 0; i < CurrentWaveform.length; i++)
	{
		PowerWaveform[i] = CurrentWaveform[i] * VoltageWaveform[i];
		
		if(PowerWaveform[i] < 0)
			PowerWaveform[i] = PowerWaveform[i] * (-1);
	}
	
	// Find pulse
	for(i = 0; i < CurrentWaveform.length; i++)
	{
		if((CurrentWaveform[i]) > (Current / 10))
		{			
			StopIndex = i;
			TimeCounter++;
		}
	}
	
	TimeCounter = Math.floor(TimeCounter * ((PulseWidth - TurnOnTime) / PulseWidth));
	StartIndex = StopIndex - TimeCounter;
	
	for(i = StartIndex; i <= StopIndex; i++)
		ZthPowerPulse += PowerWaveform[i];
	
	// Power dissapation averaging 
	for(i = Math.floor(StopIndex * 0.8); i < Math.floor(StopIndex * 0.9); i++)
	{
		AvgPowerDUT += PowerWaveform[i];
		AvgCounter++;
	}
	
	AvgPowerDUT = AvgPowerDUT / AvgCounter;
	
	for(i = 0; i < PowerWaveform.length; i++)
	{
		if((i >= StartIndex) && (i <= StopIndex))
			PowerWaveformRef[i] = AvgPowerDUT;
		else
			PowerWaveformRef[i] = 0;
	}
	
	RefPowerPulse = AvgPowerDUT * TimeCounter;
	Error = ((ZthPowerPulse - RefPowerPulse) / RefPowerPulse * 100).toFixed(2);
	
	p("");
	p("RefPowerPulse : " + Math.floor(RefPowerPulse));
	p("ZthPowerPulse : " + Math.floor(ZthPowerPulse));
	p("Error         : " + Error);
	p("--------------------------------");
	
	plot2s(PowerWaveform, PowerWaveformRef, 1, 0)
}
//------------------------------

function Zth_CollectT(N, Pause)
{
	var Tcase = [];
	var Tcool = [];
	
	for(i = 0; i < N; i++)
	{		
		Tcase[i] = Zth_Tcase2();
		Tcool[i] = Zth_Tcool2();
		
		p("#" + i);
		p("Tcase,       C : " + Tcase[i]);
		p("Tcool,       C : " + Tcool[i]);
		p("------------------------");
		
		sleep(Pause);
		
		if(anykey())
			break;
	}
	pl(Tcase);
	pl(Tcool);
}
//------------------------------

function Zth_CollectTErr()
{
	var ErrT1 = [];
	var ErrT2 = [];
	var TFluke = [];
	var Counter = 0;
	var key = 0;
	var Tcase, Tcool;
	
	while(key != "s")
	{
		print("Enter temperature (in C):");
		TFluke[Counter] = readline();
		
		Tcase = Zth_Tcase2();
		Tcool = Zth_Tcool2();
		
		ErrT1[Counter] = (Tcase - TFluke[Counter]).toFixed(2);
		ErrT2[Counter] = (Tcool - TFluke[Counter]).toFixed(2);
		
		p("Tcase,       C : " + Tcase);
		p("Tcool,       C : " + Tcool);
		p("Tcase Error, С : " + ErrT1[Counter]);
		p("Tcool Error, С : " + ErrT2[Counter]);
		p("------------------------");
		
		Counter++;
		
		print("Please press s, to stop the test, else press eny key");
		key = readkey();
	}
	
	scattern(TFluke, ErrT1, "Temperature (in C)", "Error (in %)", "Temperature relative error");
	scattern(TFluke, ErrT2, "Temperature (in C)", "Error (in %)", "Temperature relative error");
}
//------------------------------