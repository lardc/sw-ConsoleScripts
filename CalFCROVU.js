include("TestFCROVU.js")
include("Tektronix.js")

cfdvdt_chMeasure = 2;
// Measure method
cfdVdt_RiseTime =			1; // Встроенная функция Rise Time на Tek
cfdVdt_Approx =				2; // Апроксимация линейная с вычитываем точек измерения

cfdvdt_MeasureMethod = cfdVdt_Approx;

// DeviceState
DS_None = 0;
//DS_Fault = 1;
//DS_Disabled = 2;
DS_Ready = 4;

// Definition section (modification is dangerous)
cfdvdt_def_VGateMin = 1750;
cfdvdt_def_VGateMax = 4700;
cfdvdt_def_SetpointCount = 10;
Time = 40;

// Use averages in OSC
cfdvdt_NO_AVERAGES = 1;
cfdvdt_AVERAGES_4 = 4;
cfdvdt_AVERAGES_16 = 16;
cfdvdt_def_UseAverage = cfdvdt_AVERAGES_4;

// Voltage rate points
cfdvdt_RatePoint = [20, 50, 100, 200]
cfdvdt_Current = [399, 799, 1199, 1599]

// Definition range config
cfdvdt_def_NO_RANGE = 3; 		// for compibility old pcb
cfdvdt_def_SetpointStartAddr = {}
cfdvdt_def_SetpointStartAddr[cfdvdt_def_NO_RANGE] = 20;
//
cfdvdt_CalVoltage = 500;
cfdvdt_SelectedRange = cfdvdt_def_NO_RANGE;
cfdvdt_HVProbeScale = "100"	// Коэффициент деления щупа
cfdvdt_DeviderRate = 10; 	// Делитель скорости

cfdvdt_def_UseSaveImage = true;

// Results storage
cfdvdt_scatter = [];
cfdvdt_scatter05 = [];
cfdvdt_ratesc = [];
cfdvdt_rateset = [];
cfdvdt_rateerr = [];
cfdvdt_gate = [];
csv_array = [];

// Инициализация портов подключения 
//CfdVdt_Init(1,2,1)
function CfdVdt_Init(portfdVdt, portTek, channelMeasure)
{
	if (channelMeasure < 1 || channelMeasure > 4)
	{
		print("Wrong channel numbers");
		return;
	}
	
	// Copy channel information
	cfdvdt_chMeasure = channelMeasure;
	
	// Init fdVdt
	dev.Disconnect();
	dev.Connect(portfdVdt);
	
	// Init Tektronix
	TEK_PortInit(portTek);
	
	// Tektronix init
	// Init channels
	TEK_ChannelInit(channelMeasure, cfdvdt_HVProbeScale, "10");
	// Init trigger
	TEK_TriggerInit(channelMeasure, "10");
	// Horizontal settings
	TEK_Horizontal("5e-6", "0");
	
	// Display channels
	for (var i = 1; i <= 4; i++)
	{
		if (i == cfdvdt_chMeasure)
			TEK_ChannelOn(i);
		else
			TEK_ChannelOff(i);
	}
	
	// Init measurement
	CfdVdt_TekMeasurement(channelMeasure);
}

// Калибровка
function CfdVdt_FixRate() 
{
	// Re-enable power
	if(dev.r(192) == DS_None)
	{
		dev.c(1);
		while (dev.r(192) != DS_Ready)
			sleep(100);
	}	
	else	
	{
		dev.c(2);
		while (dev.r(192) != DS_None)
			sleep(100);

		dev.c(1);
		while (dev.r(192) != DS_Ready)
			sleep(100);
	}
	// Base DataTable address
	var BaseDTAddress = cfdvdt_def_SetpointStartAddr[cfdvdt_SelectedRange];
	GateFixV = 0;
	CfdVdt_ApproxRate();
	for (var i = 0; i < cfdvdt_RatePoint.length; i++)
	{
		GateFixV = Cal_AproxRate[2] + cfdvdt_RatePoint[i] * Cal_AproxRate[1] + cfdvdt_RatePoint[i] * cfdvdt_RatePoint[i] * Cal_AproxRate[0];
		// Write to DataTable
		dev.w(BaseDTAddress + i * 2, GateFixV);
		dev.w(BaseDTAddress + i * 2 + 1, cfdvdt_RatePoint[i] * 10);

		print("Vgt,     mV: " + GateFixV);
		print("dV/dt, V/us: " + cfdvdt_RatePoint[i]);
		print("-- result " + (i + 1) + " of " + cfdvdt_RatePoint.length + " --");
	}	
}

//Верификация
function CfdVdt_CollectFixedRate(Repeat)
{
	CfdVdt_ResetA();

	// Re-enable power
	if(dev.r(192) == DS_None)
	{
		dev.c(1);
		while (dev.r(192) != DS_Ready)
			sleep(100);
	}	
	else	
	{
		dev.c(2);
		while (dev.r(192) != DS_None)
			sleep(100);

		dev.c(1);
		while (dev.r(192) != DS_Ready)
			sleep(100);
	}
	
	var Voltage = cfdvdt_CalVoltage;
	
	var cntDone = 0;
	var cntTotal = cfdvdt_RatePoint.length * Repeat;

	CfdVdt_TekVScale(cfdvdt_chMeasure, Voltage);
	TEK_TriggerInit(cfdvdt_chMeasure, Voltage / 2);
	TEK_Busy();
	
	print("      dV/dt, V/us      ");
	print("  set  |  osc  |  err  ");
	print("-----------------------");

	for (var counter = 0; counter < Repeat; counter++)
	{
		for (var i = 0; i < cfdvdt_Current.length ; i++)
		{
			print("Current = " + cfdvdt_Current[i]);
			for (var l = 0; l < cfdvdt_RatePoint.length; l++)
			{
				cfdvdt_rateset.push(cfdvdt_RatePoint[i]);
				CfdVdt_TekHScale(Voltage, cfdvdt_RatePoint[l]);
				CfdVdt_ClearDisplay();
				sleep(1000);

				// Start pulse
				for(var CounterAverages = 0; CounterAverages < cfdvdt_def_UseAverage; CounterAverages++)
				{
					fdVdt_StartPulse(cfdvdt_RatePoint[l], cfdvdt_Current[i]);
					sleep(1000);
				}
				sleep(2000);
				var v = CfdVdt_MeasureVfast();

				switch(cfdvdt_MeasureMethod)
				{
					case cfdVdt_RiseTime:
						var rate = CfdVdt_MeasureRate();
						break;
					case cfdVdt_Approx:
						var rate = SiC_CALC_dVdt(SiC_GD_GetChannelCurve(cfdvdt_chMeasure),10,90).toFixed(1);
						break;
				}
				fdVdt_err = ((rate - cfdvdt_RatePoint[l]) / cfdvdt_RatePoint[l] * 100).toFixed(1);
				cfdvdt_rateerr.push(fdVdt_err);

				V_err = ((v - Voltage) / Voltage * 100).toFixed(1)
				print("  " + cfdvdt_RatePoint[l] + (cfdvdt_RatePoint[l] < 100 ? " " : "") + "  | " + rate + (rate < 100 ? " " : "") + " | " + (fdVdt_err >= 0 ? " " : "") + fdVdt_err);

				cntDone++;
				CfdVdt_StoreVoltageAndFixRate(cfdvdt_RatePoint[l], rate, Voltage, v);
				if (cfdvdt_def_UseSaveImage)
				{
					var NameFile = "" + cfdvdt_Current[i] + Voltage + cfdvdt_RatePoint[l] + "";
					var SaveImage = "save:image \"A:\\" + NameFile + ".BMP\"";
					TEK_Send(SaveImage);
					sleep(3000);
					TEK_Busy();
				}
				if (anykey()){ print("Stopped from user"); return};
			}
		}
	}
	// Power disable
	dev.c(2);
	scattern(cfdvdt_rateset, cfdvdt_rateerr, "Set dU/dt (in V/us)", "Error (in %)", "dU/dt setpoint relative error");
}

function CfdVdt_ApproxRate()
{
	CfdVdt_ResetA();
	var GateSetpointV = CGEN_GetRange(cfdvdt_def_VGateMin, cfdvdt_def_VGateMax, Math.round((cfdvdt_def_VGateMax - cfdvdt_def_VGateMin) / (cfdvdt_def_SetpointCount - 1)));

	CfdVdt_TekVScale(cfdvdt_chMeasure, cfdvdt_CalVoltage);
	TEK_TriggerInit(cfdvdt_chMeasure, cfdvdt_CalVoltage / 2);

	for (var l = 0; l < cfdvdt_Current.length; l++)
	{
		for (var i = 0; i < GateSetpointV.length; i++)
		{
			// Force triggering
			CfdVdt_ClearDisplay();
			sleep(1500);

			// Coarse horizontal setting
			if (i == 0)
			{ 
				TEK_Horizontal("5e-6", "0");
				sleep(500);
			}

			// Start pulse
			fdVdt_DiagPulse(GateSetpointV[i],cfdvdt_Current[l], Time);
			sleep(1000);
		
			// Fine horizontal setting
			CfdVdt_TekHScale(cfdvdt_CalVoltage, CfdVdt_MeasureRate());
		
			CfdVdt_ClearDisplay();
			sleep(1000);
			// Start pulse
			for(var CounterAverages = 0; CounterAverages < cfdvdt_def_UseAverage; CounterAverages++)
			{
				fdVdt_DiagPulse(GateSetpointV[i],cfdvdt_Current[l], Time);
				sleep(500);
			}
		
			var rate = SiC_CALC_dVdt(SiC_GD_GetChannelCurve(cfdvdt_chMeasure),10,90).toFixed(1);

			cfdvdt_gate.push(GateSetpointV[i]);
			cfdvdt_ratesc.push(rate);
			csv_array.push(rate + ";" + GateSetpointV[i])

			print("Vgt,     mV: " + GateSetpointV[i]);
			print("dV/dt, V/us: " + rate);
			print("-- result " + (i + 1) + " of " + GateSetpointV.length + " --");
		
			if (anykey()) return 1;
		}
	}
	save(cgen_correctionDir + "/" + "CfdVdtRate" + ".csv", csv_array);
	scattern(cfdvdt_gate, cfdvdt_ratesc, "Gate voltage (in mV)", "Rate voltage (in V/us)", "Проверка на линейную зависимость параметров");
	Cal_AproxRate = CGEN_GetCorrection2("CfdVdtRate");
	return Cal_AproxRate;
}


function CfdVdt_StoreVoltageAndFixRate(Rate, RateScope, Voltage, VoltageScope)
{
	var ConfiguredRate, RateErr, RateSet;
	var VoltageErr = ((VoltageScope - Voltage) / Voltage * 100).toFixed(1);
	
	RateErr = ((RateScope - Rate) / Rate * 100).toFixed(1);
	cfdvdt_scatter05.push(RateScope + ";" + RateErr + ";" + Voltage + ";" + VoltageScope + ";" + VoltageErr);
	
	cfdvdt_scatter.push(Rate + ";" + RateScope + ";" + RateErr + ";" + Voltage + ";" + VoltageScope + ";" + VoltageErr);
}

function CfdVdt_PrintSetpoints()
{
	print("Selected range code: " + cfdvdt_SelectedRange);
	print("-----");
	
	// Base DataTable address
	var BaseDTAddress = cfdvdt_def_SetpointStartAddr[cfdvdt_SelectedRange];
	
	for (var i = 0; i < cfdvdt_def_SetpointCount; i++)
	{
		var reg = BaseDTAddress + i * 2;
		print((i + 1) + "# Vgate,  mV [" + reg + "]: " + dev.r(reg));
		print((i + 1) + "# Rate, V/us [" + (reg + 1) + "]: " + dev.r(reg + 1));
		print("-----");
	}
}

function CfdVdt_ClearDisplay()
{
	sleep(500);
	TEK_AcquireSample();
	if(cfdvdt_def_UseAverage > 1)
		TEK_AcquireAvg(cfdvdt_def_UseAverage);	
}

function CfdVdt_MeasureRate()
{
	return (TEK_Measure(cfdvdt_chMeasure) * 0.8 / TEK_Exec("measurement:meas2:value?") * 1e-6).toFixed(2);
}

function CfdVdt_MeasureVfast()
{
	return parseFloat(TEK_Measure(cfdvdt_chMeasure)).toFixed(2);
}

function CfdVdt_TekVScale(Channel, Voltage)
{
	// 0.9 - use 90% of full range
	// 8 - number of scope grids in full scale
	var scale = (Voltage / (8 * 0.9));
	TEK_Send("ch" + Channel + ":scale " + scale);
}

function CfdVdt_TekHScale(Voltage, Rate)
{
	var k = 3.7;
	var RiseTime = ((Voltage / Rate) / k) * 1e-6;
	TEK_Horizontal(RiseTime.toExponential(), "0");
	TEK_Busy();
}
// лишняя функция
function CfdVdt_ChannelInit(Channel, Probe, Scale)
{
	TEK_Send("ch" + Channel + ":bandwidth on");
	TEK_Send("ch" + Channel + ":coupling dc");
	TEK_Send("ch" + Channel + ":invert off");
	TEK_Send("ch" + Channel + ":position -4");
	TEK_Send("ch" + Channel + ":probe " + Probe);
	TEK_Send("ch" + Channel + ":scale " + Scale);
}

function CfdVdt_TekMeasurement(Channel)
{
	TEK_Send("measurement:meas1:source ch" + Channel);
	TEK_Send("measurement:meas1:type maximum");
	TEK_Send("measurement:meas2:source ch" + Channel);
	TEK_Send("measurement:meas2:type rise");
	TEK_Send("measurement:meas3:source ch" + 2);
	TEK_Send("measurement:meas3:type maximum");
	TEK_Send("measurement:meas4:source ch" + 3);
	TEK_Send("measurement:meas4:type maximum");
	TEK_Send("measurement:meas5:source ch" + 4);
	TEK_Send("measurement:meas5:type maximum");
}

function CfdVdt_ResetA()
{
	cfdvdt_scatter = [];
	cfdvdt_scatter05 = [];
	cfdvdt_ratesc = [];
	cfdvdt_rateset = [];
	cfdvdt_rateerr = [];
	cfdvdt_gate = [];
	csv_array = [];
}

function CfdVdt_SaveA(Name)
{
	save("data/dvdt_" + Name + ".csv", cfdvdt_scatter);
}
