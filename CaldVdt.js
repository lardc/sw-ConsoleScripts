include("Tektronix.js")
include("CalGeneral.js")
include("TestdVdt.js")
include("SiC_Calc.js")

cdvdt_chMeasure = 1;
cdvdt_Powerex = 0;

// DeviceState
DS_None = 0;
DS_Fault = 1;
DS_Disabled = 2;
DS_Ready = 3;
DS_InProcess = 4;

// For 3d scatter plot use Matlab following commands
// scatter3(x, y, z, 40, z, 'filled');
// colorbar;

// Definition section (modification is dangerous)
cdvdt_def_SetpointCount = 7;
cdvdt_def_VGateMin = 1800;
cdvdt_def_VGateMax = 5000;

// Definition range config
cdvdt_def_NO_RANGE = 3; 		// for compibility old pcb

if (cdvdt_Powerex)
{
	cdvdt_def_RANGE_LOW = 1;
	cdvdt_def_RANGE_MID = 2;
	cdvdt_def_RANGE_HIGH = 0;
}
else
{
	cdvdt_def_RANGE_LOW = 0;
	cdvdt_def_RANGE_MID = 1;
	cdvdt_def_RANGE_HIGH = 2;
}

cdvdt_def_SetpointStartAddr = {}
cdvdt_def_SetpointStartAddr[cdvdt_def_RANGE_LOW]  = 320;
cdvdt_def_SetpointStartAddr[cdvdt_def_RANGE_MID]  = 410;
cdvdt_def_SetpointStartAddr[cdvdt_def_RANGE_HIGH] = 40;
cdvdt_def_SetpointStartAddr[cdvdt_def_NO_RANGE] = 30;
//
cdvdt_CalVoltage = 900;
cdvdt_SelectedRange = cdvdt_def_RANGE_LOW;
cdvdt_HVProbeScale = 1000					// Коэффициент деления щупа
cdvdt_DeviderRate = 10; 					// Делитель скорости. Установить равным 1 если плата без диапазонов 

// Voltage settings for unit calibration
cdvdt_Vmin = 500;
cdvdt_Vmax = 4500;
cdvdt_Points = 10;
//
cdvdt_collect_v = 0;

// Measure method
dVdt_HandCursors =		1; // Курсоры вручную
dVdt_RiseTime =			2; // Встроенная функция Rise Time на Tek
dVdt_Approx =			3; // Апроксимация линейная с вычитываем точек измерения
dVdt_AutoCursor =		4; // Курсоры автоматически по заданным уровням

cdvdt_MeasureMethod = dVdt_AutoCursor;

cdvdt_def_UseSaveImage = false;

// Voltage rate points
cdvdt_RatePoint = [200, 500, 1000, 1600, 2000, 2500];

// Use averages in OSC
cdvdt_NO_AVERAGES = 1;
cdvdt_AVERAGES_4 = 4;
cdvdt_AVERAGES_16 = 16;
cdvdt_def_UseAverage = cdvdt_NO_AVERAGES;

// Data arrays
cdvdt_scatter = [];
//
cdvdt_scatter05 = [];
cdvdt_scatter10 = [];
cdvdt_scatter16 = [];
cdvdt_scatter20 = [];
cdvdt_scatter25 = [];
//
cdvdt_gate = [];

// Tektronix data
cdvdt_rate_sc = [];
cdvdt_v_sc = [];

// Set data
cdvdt_rate_set = [];
cdvdt_v_set = [];

// Relative error
cdvdt_rate_err = [];
cdvdt_v_err = [];

// Summary error
cdvdt_rate_err_sum = [];
cdvdt_v_err_sum = [];

// Measurement errors
EUosc = 3;
EProbe = 2;

E0dvdt = 0;
E0V = 0;
ETosc = 0;

function CdVdt_Init(portdVdt, portTek, channelMeasure)
{
	if (channelMeasure < 1 || channelMeasure > 4)
	{
		print("Wrong channel numbers");
		return;
	}
	
	// Copy channel information
	cdvdt_chMeasure = channelMeasure;
	
	// Init dVdt
	dev.Disconnect();
	dev.Connect(portdVdt);
	
	// Init Tektronix
	TEK_PortInit(portTek);
	
	// Tektronix init
	// Init channels
	TEK_ChannelInit(cdvdt_chMeasure, cdvdt_HVProbeScale, "100");
	// Init trigger
	TEK_TriggerInit(cdvdt_chMeasure, "100");
	// Horizontal settings
	TEK_Horizontal("25e-6", "0");
	
	// Display channels
	for (var i = 1; i <= 4; i++)
	{
		if (i == cdvdt_chMeasure)
			TEK_ChannelOn(i);
		else
			TEK_ChannelOff(i);
	}
	
	// Init cursor
	CdVdt_TekCursor(channelMeasure);
	
	// Init measurement
	CdVdt_TekMeasurement(cdvdt_chMeasure);
}

function CdVdt_TekCursor(Channel)
{
	TEK_Send("cursor:select:source ch" + Channel);
	TEK_Send("cursor:function vbars");
	TEK_Send("cursor:vbars:position1 100e-6");
	TEK_Send("cursor:vbars:position2 -100e-6");
}

function CdVdt_SetTekCursor(Channel, Cursor1, Cursor2)
{
	TEK_Send("cursor:select:source ch" + Channel);
	TEK_Send("cursor:function vbars");
	TEK_Send("cursor:vbars:position1 " + Cursor1);
	TEK_Send("cursor:vbars:position2 " + Cursor2);
}

function CdVdt_SwitchToCursor()
{
	TEK_Send("cursor:function vbars");
}

function CdVdt_TekMeasurement(Channel)
{
	TEK_Send("measurement:meas1:source ch" + Channel);
	TEK_Send("measurement:meas1:type maximum");
	TEK_Send("measurement:meas2:source ch" + Channel);
	TEK_Send("measurement:meas2:type rise");
	TEK_Send("measurement:meas3:source ch" + Channel);
	TEK_Send("measurement:meas3:type pk2pk");
}

function CdVdt_SwitchToMeasurement()
{
	TEK_Send("measurement:meas1:type maximum");
}

function CdVdt_MeasuredVdt(Channel)
{
	TEK_Send("cursor:select:source ch" + Channel);
	sleep(1000);
	
	var U1 = TEK_Exec("cursor:vbars:hpos1?");
	var U2 = TEK_Exec("cursor:vbars:hpos2?");
	var dT = TEK_Exec("cursor:vbars:delta?");
	
	var dVdt = (U2 - U1) / dT / 1000000;

	return parseFloat(dVdt).toFixed(2);
}

function CdVdt_MeasureV()
{
	return Math.round(TEK_Exec("cursor:vbars:hpos1?"));
}

function CdVdt_CursorMeasureV()
{
	return Math.round(TEK_Exec("cursor:vbars:hpos1?"));
}

function CdVdt_MeasureVfast()
{
	return Math.round(TEK_Measure(1));
}

function CdVdt_MeasureRate()
{
	var TimeRate = TEK_Exec("measurement:meas2:value?");
	//print("Time Rate, us " + (TimeRate  * 1e6).toFixed(2));
	return (TEK_Measure(3) * 0.8 / TimeRate  * 1e-6).toFixed(1);
}

function CdVdt_MeasureAutoCursor(Voltage, Rate, LowLevel, HighLevel)
{
	var cdvdt_u90 = Voltage * HighLevel / 100;
	var cdvdt_u10 = Voltage * LowLevel / 100;
	var cdvdt_u50 = Voltage * 0.5;

	var cdvdt_u90_err_high = cdvdt_u90 * 1.1
	var cdvdt_u90_err_low = cdvdt_u90 * 0.8

	var cdvdt_u10_err_high = cdvdt_u10 * 1.3
	var cdvdt_u10_err_low = cdvdt_u10 * 0.8

	var cdvdt_timescale = TEK_Exec("horizontal:main:scale?");
	var cdvdt_timestep = cdvdt_timescale / 25;

	var cursor_place1 = ((cdvdt_u10 - cdvdt_u50) / Rate) * 1e-6 - 3 * cdvdt_timestep;
	var cursor_place2 = ((cdvdt_u90 - cdvdt_u50) / Rate) * 1e-6 - 3 * cdvdt_timestep;

	var cdvdt_u_err = 0;

	do
	{
		TEK_Send("cursor:vbars:position1 "+ cursor_place1);
		TEK_Send("cursor:vbars:position2 "+ cursor_place2);
		cdvdt_u_hpos1 = parseFloat(TEK_Exec("cursor:vbars:hpos1?"));
		cdvdt_u_hpos1.toFixed(1);
		cdvdt_u_hpos2 = parseFloat(TEK_Exec("cursor:vbars:hpos2?"));
		cdvdt_u_hpos2.toFixed(1);		
		if (anykey()) return 0;
	} while(cdvdt_u_hpos1 > 10e+6 || cdvdt_u_hpos2 > 10e+6)

	while((cdvdt_u_hpos2 > cdvdt_u90_err_high || cdvdt_u_hpos2 < cdvdt_u90_err_low) ||
		(cdvdt_u_hpos1 > cdvdt_u10_err_high || cdvdt_u_hpos1 < cdvdt_u10_err_low))
	{
		cdvdt_u_err = cdvdt_u_hpos2 - cdvdt_u90;
		if(cdvdt_u_err > 0)
			cursor_place_fixed2 = cdvdt_timestep;
		else
			cursor_place_fixed2 = -cdvdt_timestep;
		
		// Корректировка, отправка нового положения курсора и измерение напряжения в этой точке
		cursor_place2 = cursor_place2 - cursor_place_fixed2;
		TEK_Send("cursor:vbars:position2 " + cursor_place2);
		cdvdt_u_hpos2 = parseFloat(TEK_Exec("cursor:vbars:hpos2?"));
		cdvdt_u_hpos2.toFixed(1);

		if (anykey()) return 0;

		cdvdt_u_err = cdvdt_u_hpos1 - cdvdt_u10;
		if(cdvdt_u_err > 0)
			cursor_place_fixed1 = cdvdt_timestep;
		else
			cursor_place_fixed1 = -cdvdt_timestep;

		// Корректировка, отправка нового положения курсора и измерение напряжения в этой точке
		cursor_place1 = cursor_place1 - cursor_place_fixed1;
		TEK_Send("cursor:vbars:position1 " + cursor_place1);
		cdvdt_u_hpos1 = parseFloat(TEK_Exec("cursor:vbars:hpos1?"));
		cdvdt_u_hpos1.toFixed(1);

		if (anykey()) return 0;
	}

	var U1 = TEK_Exec("cursor:vbars:hpos1?");
	var U2 = TEK_Exec("cursor:vbars:hpos2?");
	var dT = TEK_Exec("cursor:vbars:delta?");
	var dVdt = (U2 - U1) / dT / 1e+6;

	var dT_err_Theta = cdvdt_timescale * 0.004 * 1e+6 + 0.0001 * dT * 1e+6 + 0.0006;
	var dT_err_Epsilon = dT_err_Theta / (dT * 1e+6);

	return {Rate : parseFloat(dVdt), TimeErr : dT_err_Epsilon};
}

function CdVdt_TekVScale(Channel, Voltage)
{
	// 0.85 - use 90% of full range
	// 8 - number of scope grids in full scale
	var scale = Math.round(Voltage / (0.85 * 8));
	TEK_Send("ch" + Channel + ":scale " + scale);
	TEK_Busy();
}

function CdVdt_TekHScale(Channel, Voltage, Rate)
{
	var k = 2.8;
	var RiseTime = ((Voltage / Rate) / k) * 1e-6;
	TEK_Horizontal(RiseTime.toExponential(), "0");
	TEK_Busy();
}

function CdVdt_CellCalibrateRateA(CellArray)
{
	// Power disable all cells
	dev.c(2);
	dev.c(3);
	sleep(1000);

	dev.w(128,4400);
	dev.w(129,200);
	
	p("Disabling all flyback.");

	for (var i = 1; i < 6; i++)
	{
		dVdt_CellCall(i, 2);
		sleep(1000);
	}
	
	for (var i = 0; i < CellArray.length; i++)
	{
		CdVdt_ResetA();
		print("CELL       : " + CellArray[i] + " #RangeRate = " + cdvdt_SelectedRange);
		if (CdVdt_CellCalibrateRate(CellArray[i]) == 1) 
			return;
		else
			sleep(1000);
	}
}

function CdVdt_CellCalibrateRate(CellNumber)
{
	var GateSetpointV = CGEN_GetRange(cdvdt_def_VGateMin, cdvdt_def_VGateMax, (cdvdt_def_VGateMax - cdvdt_def_VGateMin) / (cdvdt_def_SetpointCount - 1));
	
	// Power enable cell
	dVdt_CellCall(CellNumber, 1);
	
	// Configure amplitude
	if(cdvdt_SelectedRange != cdvdt_def_NO_RANGE)
		dVdt_SelectRange(CellNumber, cdvdt_SelectedRange);
	dVdt_CellSetV(CellNumber, cdvdt_CalVoltage);

	CdVdt_TekVScale(cdvdt_chMeasure, cdvdt_CalVoltage);
	TEK_TriggerInit(cdvdt_chMeasure, cdvdt_CalVoltage / 2);
	
	// Wait for power ready
	
	
	// Base DataTable address
	var BaseDTAddress = cdvdt_def_SetpointStartAddr[cdvdt_SelectedRange] + (CellNumber - 1) * cdvdt_def_SetpointCount * 2;
	
	for (var i = 0; i < GateSetpointV.length; i++)
	{
		// Force triggering
		CdVdt_ClearDisplay();
		//TEK_TriggerInit(cdvdt_chMeasure, cdvdt_CalVoltage / 2);
		
		// Set gate cdvdt_CalVoltage
		//sleep(500);

		// Coarse horizontal setting
		if (i == 0)
		{ 
			TEK_Horizontal("50e-6", "0");
			TEK_Busy();
		}
		
		while (dVdt_CellReadReg(CellNumber, 14) == 0) sleep(100);

		dVdt_CellSetGate(CellNumber, GateSetpointV[i]);

		// Start pulse
		dev.c(114);
		while(_dVdt_Active()) sleep(50);
		sleep(1500);
		// Fine horizontal setting
		CdVdt_TekHScale(cdvdt_chMeasure, cdvdt_CalVoltage, CdVdt_MeasureRate() * 2);
		//TEK_TriggerInit(cdvdt_chMeasure, cdvdt_CalVoltage / 2);
		TEK_Busy();
		CdVdt_ClearDisplay();
		
		// Start pulse
		for(var CounterAverages = 0; CounterAverages < cdvdt_def_UseAverage; CounterAverages++)
		{
			for (var count_p = 0; count_p < 3; count_p++)
			{
				dev.c(114);
				sleep(500);
				while(_dVdt_Active()) sleep(100);
				while(dVdt_CellReadReg(CellNumber, 14) == 0) sleep(100);
			}
		}

		TEK_Busy();
		sleep(600);
		var v = CdVdt_MeasureVfast();
		TEK_Busy();

		switch(cdvdt_MeasureMethod)
		{
			case dVdt_HandCursors:
				print("Enter delta voltage value (in V):");
				var dV	=	readline();
				print("Enter delta time value (in us):");
				var dt	=	readline();
				var rate = (dV / dt).toFixed(2);
				CdVdt_TekMeasurement(cdvdt_chMeasure);
				sleep(1000);
				break;

			case dVdt_RiseTime:
				var rate = CdVdt_MeasureRate();
				break;

			case dVdt_Approx:
				var rate = SiC_CALC_dVdt(SiC_GD_GetChannelCurve(cdvdt_chMeasure),10,90).toFixed(1);
				break;

			case dVdt_AutoCursor:
				var rate = CdVdt_MeasureRate();
				CdVdt_SwitchToCursor();
				rate = CdVdt_MeasureAutoCursor(v, rate, 10, 90).toFixed(1);
				CdVdt_TekMeasurement(cdvdt_chMeasure);
				break;
		}

		TEK_Busy();
		if (rate == 0 || rate == Infinity || rate > 3000)
		{
			print("Cell " + CellNumber + ". No pulse at gate voltage " + GateSetpointV[i] + "mV.");
			return 1;
		}
		
		cdvdt_gate.push(GateSetpointV[i]);
		cdvdt_rate_sc.push(rate);

		print("Vgt,     mV: " + GateSetpointV[i]);
		print("dV/dt, V/us: " + rate);
		print("Vmax,     V: " + v);
		print("-- result " + (i + 1) + " of " + GateSetpointV.length + " --");
		
		// Write to DataTable
		dev.w(BaseDTAddress + i * 2, GateSetpointV[i]);
		dev.w(BaseDTAddress + i * 2 + 1, rate * cdvdt_DeviderRate);
		
		if (anykey()) return 1;
	}
	scattern(cdvdt_gate, cdvdt_rate_sc, "Gate voltage (in mV)", "Rate voltage (in V/us)", "Cell #" +
			CellNumber + " range: " + cdvdt_SelectedRange + "; Vd = " + cdvdt_CalVoltage + " V; " +
			cdvdt_rate_sc[0] + ".." + cdvdt_rate_sc[cdvdt_rate_sc.length - 1] +" V/us");

	CdVdt_NonlinearityCell(cdvdt_gate, cdvdt_rate_sc, CellNumber, cdvdt_SelectedRange);

	// Power disable cell
	sleep(3000);
	dVdt_CellCall(CellNumber, 2);
	return 0;
}

// Вывод графика оценки нелинейности, относительно апроксимационной прямой
function CdVdt_NonlinearityCell(X, Y, CellNumber, cdvdt_SelectedRange)
{
	var y_err_array = [];

	var y_linear = 0;
	var y_err_max = 0;

	var sumx = 0;
	var sumy = 0;
	var sumx2 = 0;
	var sumxy = 0;
	var k = 0;
	var b = 0;
	
	Y = String(Y);
	YArray = Y.split(",");
	YFloatArray = YArray.map(Number);

	// рассчет апроксимационной прямой
	for (var i = 0; i < X.length; i++)
	{
		sumx += X[i];
		sumy += YFloatArray[i];
		sumx2 += X[i] * X[i];
		sumxy += X[i] * YFloatArray[i];
	}

	k = (X.length * sumxy - (sumx * sumy)) / (X.length * sumx2 - sumx * sumx);
	b = (sumy - k * sumx) / X.length;

	// относительная оценка отклонения скорости нарастания от прямой
	for (var i = 0; i < X.length; i++)
	{
		y_linear = k * X[i] + b
		y_err = ((YFloatArray[i] - y_linear) / y_linear * 100).toFixed(2);
		y_err_array.push(y_err);
									   
		
		// поиск макисмальной погрешности отклонения
		if (Math.abs(y_err) > y_err_max)
			y_err_max = Math.abs(y_err);
	}

	scattern(X, y_err_array, "Gate voltage (in mV)", "Error relative Nonlinearity (in %)", "Cell #" + CellNumber + " range: " + cdvdt_SelectedRange)
	//p("y_err_max, % = " + y_err_max);
}


function CdVdt_Collect(Iterations)
{
	var cdvdt_Vstp = Math.round((cdvdt_Vmax - cdvdt_Vmin) / (cdvdt_Points - 1));
	var VoltageArray = CGEN_GetRange(cdvdt_Vmin, cdvdt_Vmax, cdvdt_Vstp);
	
	var cntDone = 0;
	var cntTotal = VoltageArray.length * Iterations * 5;
	
	// Re-enable power
	dev.c(2);
	sleep(1000);
	dev.c(1);
	
	for (var k = 0; k < Iterations; k++)
	{
		for (var i = 0; i < VoltageArray.length; i++)
		{
			dev.w(128, VoltageArray[i])
			CdVdt_TekVScale(cdvdt_chMeasure, VoltageArray[i]);
			TEK_TriggerInit(cdvdt_chMeasure, VoltageArray[i] / 2);
			sleep(500);
			
			for (var j = 101; j <= 105; j++)
			{
				// Coarse horizontal setting
				if (j == 101) TEK_Horizontal("25e-6", "0");
				
				dev.c(j);
				while(_dVdt_Active()) sleep(50);
				sleep(1000);
				
				CdVdt_TekHScale(cdvdt_chMeasure, VoltageArray[i], CdVdt_MeasureRate());
				sleep(500);
				
				dev.c(j);
				while(_dVdt_Active()) sleep(50);
				sleep(1000);
				// Get rate
				var rate = CdVdt_MeasureRate();
				
				if (cdvdt_collect_v)
				{
					// Get voltage
					CdVdt_SwitchToCursor();
					sleep(1000);
					var v = CdVdt_MeasureV();
					//
					CdVdt_SwitchToMeasurement();
				}
				else
					var v = CdVdt_MeasureVfast();
				
				print("CMD        : " + j);
				print("dV/dt, V/us: " + rate);
				print("Vset,     V: " + VoltageArray[i]);
				print("V,        V: " + v);
				
				cntDone++;
				print("-- result " + cntDone + " of " + cntTotal + " --");
				
				CdVdt_StoreVoltageAndRate(j, rate, VoltageArray[i], v);
				
				if (anykey()) return;
			}
		}
	}
	
	// Power disable
	dev.c(2);
}

function CdVdt_CollectFixedRate(Repeat)
{
	CdVdt_ResetA();

	// Re-enable power
	if(dev.r(192) != DS_Ready)
	{
		if (dev.r(192) == DS_Fault)
		{
			PrintStatus();
			return 0;
		}

		if (dev.r(192) == DS_None || dev.r(192) == DS_Disabled)
			dev.c(1);

		while(_dVdt_Active())
			sleep(100);
	}
	
	var VoltageArray = CGEN_GetRange(cdvdt_Vmin, cdvdt_Vmax, (cdvdt_Vmax - cdvdt_Vmin) / (cdvdt_Points - 1));
	
	var cntDone = 0;
	var cntTotal = VoltageArray.length * cdvdt_RatePoint.length * Repeat;
	
	print("      dV/dt, V/us      |       Voltage, V      ");
	print("  set  |  osc  |  err  |  set  |  osc  |  err  ");
	print("-----------------------------------------------");

	for (var counter = 0; counter < Repeat; counter++)
	{
		for (var k = 0; k < VoltageArray.length; k++)
		{
			dev.w(128, VoltageArray[k]);
			CdVdt_TekVScale(cdvdt_chMeasure, VoltageArray[k]);
			TEK_TriggerInit(cdvdt_chMeasure, VoltageArray[k] / 2);
			TEK_Busy();
			for (var i = 0; i < cdvdt_RatePoint.length; i++)
			{
				//sleep(1000);
				dev.w(129, cdvdt_RatePoint[i] * cdvdt_DeviderRate)
				
				CdVdt_TekHScale(cdvdt_chMeasure, VoltageArray[k], cdvdt_RatePoint[i]);
				//sleep(500);
				CdVdt_ClearDisplay();
				//sleep(1000);
				
				// Start pulse
				for (var CounterAverages = 0; CounterAverages < cdvdt_def_UseAverage; CounterAverages++)
				{
					while (_dVdt_Active())
					{
						if (anykey()){ print("Stopped from user!"); return};
						sleep(100);
					}

					dev.c(100);

					while (_dVdt_Active())
					{
						if (anykey()){ print("Stopped from user!"); return};
						sleep(100);
					}

					dev.c(100);
					
					while (_dVdt_Active())
					{
						if (anykey()){ print("Stopped from user!"); return};
						sleep(100);
					}

					dev.c(100);

					while(TEK_Exec("TRIGger:STATE?") == "REA") sleep(50);
					//print("Impulse #" + (CounterAverages + 1))
				}
				TEK_Busy();
				sleep(500);
				var v = CdVdt_MeasureVfast();
				TEK_Busy();

				switch(cdvdt_MeasureMethod)
				{
					case dVdt_HandCursors:
						print("Enter delta voltage value (in V):");
						var dV	=	readline();
						print("Enter delta time value (in us):");
						var dt	=	readline();
						var rate = (dV / dt).toFixed(2);
						CdVdt_TekMeasurement(cdvdt_chMeasure);
						sleep(1000);
						break;

					case dVdt_RiseTime:
						var rate = CdVdt_MeasureRate();
						break;

					case dVdt_Approx:
						var rate = SiC_CALC_dVdt(SiC_GD_GetChannelCurve(cdvdt_chMeasure),10,90).toFixed(1);
						break;

					case dVdt_AutoCursor:
						var rate = CdVdt_MeasureRate();
						CdVdt_SwitchToCursor();
						sleep(500);
						var rateObject = CdVdt_MeasureAutoCursor(VoltageArray[k], rate, 10, 90);
						rate = rateObject.Rate.toFixed(1);
						CdVdt_TekMeasurement(cdvdt_chMeasure);
						break;
				}

				TEK_Busy();

				dVdt_err = (rate - cdvdt_RatePoint[i]) / cdvdt_RatePoint[i] * 100;
				dVdt_err = Math.abs(dVdt_err) < 0.1 ? parseFloat(0).toFixed(1) : dVdt_err.toFixed(1);
				V_err = (v - VoltageArray[k]) / VoltageArray[k] * 100;
				V_err = Math.abs(V_err) < 0.1 ? parseFloat(0).toFixed(1) : V_err.toFixed(1);

				if(cdvdt_MeasureMethod == dVdt_AutoCursor)
					var ETosc = rateObject.TimeErr;
				else
					var ETosc = 0;

				cdvdt_rate_set.push(cdvdt_RatePoint[i]);
				cdvdt_v_set.push(VoltageArray[k]);

				cdvdt_rate_sc.push(rate);
				cdvdt_v_sc.push(v);

				cdvdt_rate_err.push(dVdt_err);
				cdvdt_v_err.push(V_err);

				// Summary error
				E0dvdt = 1.1 * Math.sqrt(Math.pow(EUosc, 2) + Math.pow(ETosc, 2) + Math.pow(EProbe, 2));
				dVdt_err_sum = (CdVdt_sign(dVdt_err)*(Math.abs(dVdt_err) + E0dvdt)).toFixed(1)
				cdvdt_rate_err_sum.push(dVdt_err_sum);

				E0V = 1.1 * Math.sqrt(Math.pow(EUosc, 2) + Math.pow(EProbe, 2));
				V_err_sum = (CdVdt_sign(V_err)*(Math.abs(V_err) + E0V)).toFixed(1)
				cdvdt_v_err_sum.push(V_err_sum);


				print("  " + cdvdt_RatePoint[i] + (cdvdt_RatePoint[i] < 100 ? " " : "") + (cdvdt_RatePoint[i] < 1000 ? " " : "") + " | " + rate + (rate < 100 ? " " : "") + (rate < 1000 ? " " : "") + "| " + (dVdt_err >= 0 ? " " : "") + dVdt_err + (Math.abs(dVdt_err) < 10 ? " " : "") + " |  " + VoltageArray[k] + (VoltageArray[k] < 100 ? " " : "") + (VoltageArray[k] < 1000 ? " " : "") + " | " + v + (v < 100 ? " " : "") + (v < 1000 ? " " : "") + "  | " + (V_err >= 0 ? " " : "") + V_err);
				//p(dev.r(38))

				//sleep(1000);
				//for (var CellID = 1; CellID <= 5; CellID++) p("Cell: " + CellID + " Range: " + dVdt_CellReadReg(CellID, 4)+ " Gate = " + dVdt_CellReadReg(CellID, 2))

				/*
				print("dV/dt set, V/us: " + cdvdt_RatePoint[i]);
				print("dV/dt osc, V/us: " + rate);
				print("dV/dt err,    %: " + ((cdvdt_RatePoint[i] - rate) / rate * 100).toFixed(1));
				print("Voltage set,  V: " + VoltageArray[k]);
				print("Voltage osc,  V: " + v);
				print("Voltage err,  %: " + ((VoltageArray[k] - v) / v * 100).toFixed(1));
				*/
				
				cntDone++;
				//print("-- result " + cntDone + " of " + cntTotal + " --");
				//CdVdt_StoreVoltageAndFixRate(cdvdt_RatePoint[i], rate, VoltageArray[k], v);
				
				if (cdvdt_def_UseSaveImage)
				{
					var NameFile = "" + VoltageArray[k] + cdvdt_RatePoint[i] + "";
					var SaveImage = "save:image \"A:\\" + NameFile + ".BMP\"";
					TEK_Send(SaveImage);
					sleep(3000);
					TEK_Busy();
				}
				if (anykey()){ print("Stopped from user!"); return};
			}
		}
	}
	// Power disable
	dev.c(2);

	CdVdt_SaveRate("dvdt_rate", "dvdt_rate_sum");
	CdVdt_SaveV("dvdt_v","dvdt_v_sum");

	// Plot relative error distribution
	scattern(cdvdt_rate_sc, cdvdt_rate_err, "Voltage / Time (in V/us)", "Error relative Rate (in %)", "dVdt relative error " + cdvdt_RatePoint.join(", ") + " V/us");
	scattern(cdvdt_v_sc, cdvdt_rate_err, "Voltage (in V)", "Error relative Voltage (in %)", "dVdt relative error " + cdvdt_RatePoint.join(", ") + " V/us");
	scattern(cdvdt_v_sc, cdvdt_v_err, "Voltage (in V)", "Error relative Voltage (in %)", "Ud relative error " + cdvdt_Vmin + "..." + cdvdt_Vmax + " V");
	
	scattern(cdvdt_rate_sc, cdvdt_rate_err_sum, "Voltage / Time (in V/us)", "Error relative Rate (in %)", "dVdt summary error " + cdvdt_RatePoint.join(", ") + " V/us");
	scattern(cdvdt_v_sc, cdvdt_rate_err_sum, "Voltage (in V)", "Error relative Voltage (in %)", "dVdt summary error " + cdvdt_RatePoint.join(", ") + " V/us");
	scattern(cdvdt_v_sc, cdvdt_v_err_sum, "Voltage (in V)", "Error relative Voltage (in %)", "Ud summary error " + cdvdt_Vmin + "..." + cdvdt_Vmax + " V");
}

function CdVdt_sign(a)
{
	if (a >= 0)
		return 1
	else if (a < 0)
		return -1
}

// Save
function CdVdt_SaveRate(NameErr,NameErrSum)
{
	CGEN_SaveArrays(NameErr, cdvdt_rate_sc, cdvdt_rate_set, cdvdt_rate_err);
	CGEN_SaveArrays(NameErrSum, cdvdt_rate_sc, cdvdt_rate_set, cdvdt_rate_err_sum);
}

function CdVdt_SaveV(NameErr, NameErrSum)
{
	CGEN_SaveArrays(NameErr, cdvdt_v_sc, cdvdt_v_set, cdvdt_v_err);
	CGEN_SaveArrays(NameErrSum, cdvdt_v_sc, cdvdt_v_set, cdvdt_v_err_sum);
}


function CdVdt_StabCheck(CellNumber, Voltage, Gate)
{
	var Counter = 20;
	
	// Power enable cell
	dVdt_CellCall(CellNumber, 1);
	
	// Configure amplitude
	if(cdvdt_SelectedRange != cdvdt_def_NO_RANGE)
		dVdt_SelectRange(CellNumber, cdvdt_SelectedRange);
	dVdt_CellSetV(CellNumber, Voltage);
	CdVdt_TekVScale(cdvdt_chMeasure, Voltage);
	TEK_TriggerInit(cdvdt_chMeasure, Voltage / 2);
	TEK_Horizontal("1.0e-6", "0");
	
	// Wait for power ready
	while (dVdt_CellReadReg(CellNumber, 14) == 0) sleep(100);
	sleep(1000);
	TEK_ForceTrig();
	
	// Set gate cdvdt_CalVoltage
	dVdt_CellSetGate(CellNumber, Gate);
	sleep(500);
	
	for (var i = 0; i < Counter; i++)
	{
		// Start pulse
		dev.c(114);
		while(_dVdt_Active()) sleep(50);
		sleep(500);
		
		if (anykey())
		{
			dVdt_CellCall(CellNumber, 2);
			return;
		}
	}
	
	dVdt_CellCall(CellNumber, 2);
}

function CdVdt_StoreVoltageAndRate(CMD, RateScope, Voltage, VoltageScope)
{
	var ConfiguredRate, RateErr, RateSet;
	var VoltageErr = ((VoltageScope - Voltage) / Voltage * 100).toFixed(1);
	
	switch (CMD)
	{
		case 101:
			RateSet = 500;
			RateErr = ((RateScope - 500) / 500 * 100).toFixed(1);
			cdvdt_scatter05.push(RateScope + ";" + RateErr + ";" + Voltage + ";" + VoltageScope + ";" + VoltageErr);
			break;
			
		case 102:
			RateSet = 1000;
			RateErr = ((RateScope - 1000) / 1000 * 100).toFixed(1);
			cdvdt_scatter10.push(RateScope + ";" + RateErr + ";" + Voltage + ";" + VoltageScope + ";" + VoltageErr);
			break;
			
		case 103:
			RateSet = 1600;
			RateErr = ((RateScope - 1600) / 1600 * 100).toFixed(1);
			cdvdt_scatter16.push(RateScope + ";" + RateErr + ";" + Voltage + ";" + VoltageScope + ";" + VoltageErr);
			break;
			
		case 104:
			RateSet = 2000;
			RateErr = ((RateScope - 2000) / 2000 * 100).toFixed(1);
			cdvdt_scatter20.push(RateScope + ";" + RateErr + ";" + Voltage + ";" + VoltageScope + ";" + VoltageErr);
			break;
			
		case 105:
			RateSet = 2500;
			RateErr = ((RateScope - 2500) / 2500 * 100).toFixed(1);
			cdvdt_scatter25.push(RateScope + ";" + RateErr + ";" + Voltage + ";" + VoltageScope + ";" + VoltageErr);
			break;
	}
	
	cdvdt_scatter.push(RateSet + ";" + RateScope + ";" + RateErr + ";" + Voltage + ";" + VoltageScope + ";" + VoltageErr);
}

function CdVdt_StoreVoltageAndFixRate(Rate, RateScope, Voltage, VoltageScope)
{
	var RateErr = ((RateScope - Rate) / Rate * 100).toFixed(1);
	var VoltageErr = ((VoltageScope - Voltage) / Voltage * 100).toFixed(1);
	
	cdvdt_scatter.push(Rate + ";" + RateScope + ";" + RateErr + ";" + Voltage + ";" + VoltageScope + ";" + VoltageErr);
}

function CdVdt_PrintSetpoints(CellNumber)
{
	print("Selected range code: " + cdvdt_SelectedRange);
	print("-----");
	
	// Base DataTable address
	var BaseDTAddress = cdvdt_def_SetpointStartAddr[cdvdt_SelectedRange] + (CellNumber - 1) * cdvdt_def_SetpointCount * 2;
	
	for (var i = 0; i < cdvdt_def_SetpointCount; i++)
	{
		var reg = BaseDTAddress + i * 2;
		print((i + 1) + "# Vgate,  mV [" + reg + "]: " + dev.r(reg));
		print((i + 1) + "# Rate, V/us [" + (reg + 1) + "]: " + dev.r(reg + 1));
		print("-----");
	}
}

function CdVdt_ResetA()
{
	cdvdt_scatter = [];
	//
	cdvdt_scatter05 = [];
	cdvdt_scatter10 = [];
	cdvdt_scatter16 = [];
	cdvdt_scatter20 = [];
	cdvdt_scatter25 = [];
	//
	cdvdt_gate = [];

	// Tektronix data
	cdvdt_rate_sc = [];
	cdvdt_v_sc = [];

	// Set data
	cdvdt_rate_set = [];
	cdvdt_v_set = [];

	// Relative error
	cdvdt_rate_err = [];
	cdvdt_v_err = [];

	// Summary error
	cdvdt_rate_err_sum = [];
	cdvdt_v_err_sum = [];
}

function CdVdt_SaveA(Name)
{
	save("data/dvdt_" + Name + ".csv", cdvdt_scatter);
}

function CdVdt_CalRate(K)
{
	dev.w(6, Math.round(K * 1000));
	dev.w(7, 1000);
}

function CdVdt_CalV(K, Offset)
{
	dev.w(0, Math.round(K * 1000));
	dev.w(1, 1000);
	dev.ws(2, Math.round(Offset));
}

function CdVdt_ResetRateCal()
{
	dev.w(3, 0);
	dev.w(5, 0);
	
	CdVdt_CalRate(1);
}

function CdVdt_ResetVCal()
{
	CdVdt_CalV(1, 0);
}

function CdVdt_ClearDisplay()
{
	TEK_AcquireSample();
	if(cdvdt_def_UseAverage > 1)
		TEK_AcquireAvg(cdvdt_def_UseAverage);
	//sleep(500);
	TEK_Busy();
}

function CdVdt_CollectdVdt(Repeat)
{
	CdVdt_ResetA();
	
	var VoltageArray = CGEN_GetRange(cdvdt_Vmin, cdvdt_Vmax, (cdvdt_Vmax - cdvdt_Vmin) / (cdvdt_Vstp - 1));
	
	var cntDone = 0;
	var cntTotal = VoltageArray.length * cdvdt_RatePoint.length * Repeat;
	
	// Re-enable power
	dev.c(2);
	sleep(1000);
	dev.c(1);

	for (var counter = 0; counter < Repeat; counter++)
	{
		for (var k = 0; k < VoltageArray.length; k++)
		{
			dev.w(128, VoltageArray[k]);
			CdVdt_TekVScale(cdvdt_chMeasure, VoltageArray[k]);
			TEK_TriggerInit(cdvdt_chMeasure, VoltageArray[k] / 2);
			
			for (var i = 0; i < cdvdt_RatePoint.length; i++)
			{
				sleep(1000);
				dev.w(129, cdvdt_RatePoint[i] * cdvdt_DeviderRate);
				
				CdVdt_TekHScale(cdvdt_chMeasure, VoltageArray[k], cdvdt_RatePoint[i]);
				sleep(1500);
				
				CdVdt_ClearDisplay();
				sleep(1500);
				
				var DesiredHalfTimeRise = ((VoltageArray[k] / 2) / cdvdt_RatePoint[i] * 1e-6).toExponential();
				
				// Start pulse
				for(var CounterAverages = 0; CounterAverages < cdvdt_def_UseAverage; CounterAverages++)
				{
					while(_dVdt_Active()) sleep(50);
					dev.c(100);
					sleep(1500);
				}
				
				sleep(1500);
				while(_dVdt_Active()) sleep(50);
				
				CdVdt_SetTekCursor(cdvdt_chMeasure, 4 * DesiredHalfTimeRise, 4 * DesiredHalfTimeRise);
				
				var v = CdVdt_CursorMeasureV();
				
				var RealHalfTimeRise = ((v / 2) / cdvdt_RatePoint[i] * 1e-6).toExponential();
				
				var FirstTimePoint =  (RealHalfTimeRise - (0.97 * v / cdvdt_RatePoint[i]) * 1e-6).toExponential();
				
				var SecondTimePoint = (RealHalfTimeRise - (0.17 * v / cdvdt_RatePoint[i]) * 1e-6).toExponential();
				
				CdVdt_SetTekCursor(cdvdt_chMeasure, FirstTimePoint, SecondTimePoint);
				
				var OutRate = CdVdt_MeasuredVdt(cdvdt_chMeasure);
				
				var dVdt_err = ((OutRate - cdvdt_RatePoint[i]) / cdvdt_RatePoint[i] * 100).toFixed(2);
				var v_err = ((v - VoltageArray[k]) / VoltageArray[k] * 100).toFixed(2);
				
				print("dVdt set,  V/us: " + cdvdt_RatePoint[i]);
				print("dV/dt osc, V/us: " + OutRate);
				print("dV/dt err,    %: " + dVdt_err);
				print("V set,        V: " + VoltageArray[k]);
				print("V osc,        V: " + v);
				print("V err,        %: " + v_err);
				
				cntDone++;
				print("-- result " + cntDone + " of " + cntTotal + " --");
				CdVdt_StoreVoltageAndFixRate(cdvdt_RatePoint[i], OutRate, VoltageArray[k], v);
				
				if (anykey()){ print("Stopped from user!"); return};
			}
		}
	}
	
	// Power disable
	dev.c(2);
}
