include("Tektronix.js")
include("CalGeneral.js")
include("TestdVdt.js")
include("SiC_Calc.js")

cdvdt_chMeasure = 1;
cdvdt_Powerex = 1;

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
cdvdt_HVProbeScale = "1000"	// Коэффициент деления щупа
cdvdt_DeviderRate = 10; 		// Делить скорости. Установить равным 1 если плата без диапазонов 

// Voltage settings for unit calibration
cdvdt_Vmin = 500;
cdvdt_Vmax = 4500;
cdvdt_Vstp = 500;
//
cdvdt_collect_v = 0;

// Measure method
dVdt_HandCursors =		1;
dVdt_RiseTime =			2;
dVdt_Approx =			3;
dVdt_AutoCursor =		4;

cdvdt_MeasureMethod = dVdt_AutoCursor;

cdvdt_def_UseSaveImage = false;

// Voltage rate points
cdvdt_RatePoint = [200, 500, 1000, 1600, 2000, 2500];

// Use averages in OSC
cdvdt_NO_AVERAGES = 1;
cdvdt_AVERAGES_4 = 4;
cdvdt_AVERAGES_16 = 16;
cdvdt_def_UseAverage = cdvdt_AVERAGES_4;

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
cdvdt_ratesc = [];

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
	TEK_ChannelInit(channelMeasure, cdvdt_HVProbeScale, "100");
	// Init trigger
	TEK_TriggerInit(channelMeasure, "100");
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
	//CdVdt_TekCursor(channelMeasure);
	
	// Init measurement
	CdVdt_TekMeasurement(channelMeasure);
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
	var ctou_tgd_u90 = Voltage * HighLevel / 100;
	var ctou_tgd_u10 = Voltage * LowLevel / 100;

	var ctou_tgd_u90_err_high = ctou_tgd_u90 * 1.1
	var ctou_tgd_u90_err_low = ctou_tgd_u90 * 0.9

	var ctou_tgd_u10_err_high = ctou_tgd_u10 * 1.2
	var ctou_tgd_u10_err_low = ctou_tgd_u10 * 0.8

	var cursor_place_calc = (((ctou_tgd_u90 - ctou_tgd_u10) / Rate) / 2) * 1e-6;
	var cursor_place1 = -cursor_place_calc;
	var cursor_place2 = cursor_place_calc;

	var ctou_tgd_u_err = 0;
	var ctou_tgd_u_preverr1 = 0;
	var ctou_tgd_u_preverr2 = 0;
	var ctou_tgd_integral1 = 0;
	var ctou_tgd_integral2 = 0;
	var ctou_tgd_derivative = 0;
	var ctou_tgd_kp = 5e-10;
	var ctou_tgd_ki = 5e-9;
	var ctou_tgd_kd = 0e-9;

	// Первое измерение для расчета будущей уставки
	do
	{
		TEK_Send("cursor:vbars:position1 "+ cursor_place1);
		TEK_Send("cursor:vbars:position2 "+ cursor_place2);
		p(cursor_place1)
		ctou_tgd_u_hpos2 = parseFloat(TEK_Exec("cursor:vbars:hpos2?"));
		ctou_tgd_u_hpos2.toFixed(1);
		p(ctou_tgd_u_hpos2)
		ctou_tgd_u_hpos1 = parseFloat(TEK_Exec("cursor:vbars:hpos1?"));
		ctou_tgd_u_hpos1.toFixed(1);
		p(ctou_tgd_u_hpos1)

	} while(ctou_tgd_u_hpos1 > 10e6 || ctou_tgd_u_hpos2 > 10e6)

	while((ctou_tgd_u_hpos2 > ctou_tgd_u90_err_high || ctou_tgd_u_hpos2 < ctou_tgd_u90_err_low) ||
		(ctou_tgd_u_hpos1 > ctou_tgd_u10_err_high || ctou_tgd_u_hpos1 < ctou_tgd_u10_err_low))
	{
		// ПИД регулятор hpos2
		ctou_tgd_u_err = ctou_tgd_u_hpos2 - ctou_tgd_u90;
		//p("err2 = " + ctou_tgd_u_err.toFixed(2));
		ctou_tgd_integral2 = ctou_tgd_integral2 + ctou_tgd_u_err * ctou_tgd_ki;
		ctou_tgd_derivative = ctou_tgd_u_err - ctou_tgd_u_preverr2;
		ctou_tgd_u_preverr2 = ctou_tgd_u_err;
		cursor_place_fixed2 = ctou_tgd_u_err * ctou_tgd_kp + ctou_tgd_integral2 * ctou_tgd_ki + ctou_tgd_derivative * ctou_tgd_kd;
		//-----------------
		
		//Если cursor_place_fixed2 будет выдавать значения менее 10 нс, то принудительно сделать шаг 10 нс.
		//Иначе при очень маленькой ошибке курсор замирает на долгое время
		
		if(Math.abs(cursor_place_fixed2) < 1e-8)
			if(cursor_place_fixed2 > 0)
				cursor_place_fixed2 = 1e-8;
			else
				cursor_place_fixed2 = -1e-8;
		
		// Корректировка, отправка нового положения курсора и измерение напряжения в этой точке
		cursor_place2 = cursor_place2 - cursor_place_fixed2;
		//p("cursor_place2 " + cursor_place2 * 1e6);
		TEK_Send("cursor:vbars:position2 " + cursor_place2);
		ctou_tgd_u_hpos2 = parseFloat(TEK_Exec("cursor:vbars:hpos2?"));
		ctou_tgd_u_hpos2.toFixed(1);
		//p("ctou_tgd_u_hpos2 = " + ctou_tgd_u_hpos2);
		if (anykey()) return 0;

		// ПИД регулятор hpos1
		ctou_tgd_u_err = ctou_tgd_u_hpos1 - ctou_tgd_u10;
		//p("err1 = " + ctou_tgd_u_err.toFixed(2));
		ctou_tgd_integral1 = ctou_tgd_integral1 + ctou_tgd_u_err * ctou_tgd_ki;
		ctou_tgd_derivative = ctou_tgd_u_err - ctou_tgd_u_preverr1;
		ctou_tgd_u_preverr1 = ctou_tgd_u_err;
		cursor_place_fixed1 = ctou_tgd_u_err * ctou_tgd_kp + ctou_tgd_integral1 * ctou_tgd_ki + ctou_tgd_derivative * ctou_tgd_kd;
		//-----------------
		
		//Если cursor_place_fixed1 будет выдавать значения менее 10 нс, то принудительно сделать шаг 10 нс.
		//Иначе при очень маленькой ошибке курсор замирает на долгое время

		if(Math.abs(cursor_place_fixed2) < 1e-8)
			if(cursor_place_fixed2 > 0)
				cursor_place_fixed2 = 1e-8;
			else
				cursor_place_fixed2 = -1e-8;

		// Корректировка, отправка нового положения курсора и измерение напряжения в этой точке
		cursor_place1 = cursor_place1 - cursor_place_fixed1;
		//p("cursor_place1 " + cursor_place1 * 1e6);
		TEK_Send("cursor:vbars:position1 " + cursor_place1);
		ctou_tgd_u_hpos1 = parseFloat(TEK_Exec("cursor:vbars:hpos1?"));
		ctou_tgd_u_hpos1.toFixed(1);
		//p("ctou_tgd_u_hpos1 = " + ctou_tgd_u_hpos1);
		if (anykey()) return 0;
		
	}

	var U1 = TEK_Exec("cursor:vbars:hpos1?");
	//print("U1 = " + U1);
	var U2 = TEK_Exec("cursor:vbars:hpos2?");
	//print("U2 = " + U2);
	var dT = TEK_Exec("cursor:vbars:delta?");
	//print("dT = " + dT);
	
	var dVdt = (U2 - U1) / dT / 1000000;
	print("dVdt = " + parseFloat(dVdt).toFixed(2));

	return parseFloat(dVdt).toFixed(2);
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
	var k = 1.5;
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
	var GateSetpointV = CGEN_GetRange(cdvdt_def_VGateMin, cdvdt_def_VGateMax, Math.round((cdvdt_def_VGateMax - cdvdt_def_VGateMin) / (cdvdt_def_SetpointCount - 1)));
	
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
			dev.c(114);
			sleep(500);
			while(_dVdt_Active()) sleep(100);
			while(dVdt_CellReadReg(CellNumber, 14) == 0) sleep(100);
		}

		TEK_Busy();
		sleep(300);
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
				CdVdt_TekMeasurement(1);
				sleep(1000);
				break;

			case dVdt_RiseTime:
				var rate = CdVdt_MeasureRate();
				break;

			case dVdt_Approx:
				var rate = SiC_CALC_dVdt(SiC_GD_GetChannelCurve(cdvdt_chMeasure),10,80).toFixed(2);
				break;

			case dVdt_AutoCursor:
				//
				break;
		}

		TEK_Busy();
		if (rate == 0 || rate == Infinity || rate > 3000)
		{
			print("Cell " + CellNumber + ". No pulse at gate voltage " + GateSetpointV[i] + "mV.");
			return 1;
		}
		
		cdvdt_gate.push(GateSetpointV[i]);
		cdvdt_ratesc.push(rate);

		print("Vgt,     mV: " + GateSetpointV[i]);
		print("dV/dt, V/us: " + rate);
		print("Vmax,     V: " + v);
		print("-- result " + (i + 1) + " of " + GateSetpointV.length + " --");
		
		// Write to DataTable
		dev.w(BaseDTAddress + i * 2, GateSetpointV[i]);
		dev.w(BaseDTAddress + i * 2 + 1, rate * cdvdt_DeviderRate);
		
		if (anykey()) return 1;
	}
	scattern(GateSetpointV, cdvdt_ratesc, "Gate voltage (in mV)", "Rate voltage (in V/us)", "Ячейка #" + CellNumber + " диапазон: " + cdvdt_SelectedRange + "; полка = " + cdvdt_CalVoltage + " В");
	// Power disable cell
	sleep(3000);
	dVdt_CellCall(CellNumber, 2);
	return 0;
}

function CdVdt_Collect(Iterations)
{
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
	if (dev.r(192) == DS_Fault)
	{
		print("Fault Reason = " + dev.r(193));
		dev.c(3);
		if (dev.r(192) == DS_None)
		{
			print("Ошибка сброшена");
			sleep(500);
			dev.c(1);
			while(_dVdt_Active())
				sleep(100);
			print("Питание в блок подано");
		}		
		else
			print("Ошибка не сброшена");
	}

	if (dev.r(192) == DS_None)
	{
		print("Отсуствует питание в блоке");
		dev.c(1);
		while(_dVdt_Active())
			sleep(100);
		print("Питание в блок подано");
		sleep(500);
	}
	
	var VoltageArray = CGEN_GetRange(cdvdt_Vmin, cdvdt_Vmax, cdvdt_Vstp);
	
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
						sleep(300);
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
						CdVdt_TekMeasurement(1);
						sleep(1000);
						break;

					case dVdt_RiseTime:
						var rate = CdVdt_MeasureRate();
						break;

					case dVdt_Approx:
						var rate = SiC_CALC_dVdt(SiC_GD_GetChannelCurve(cdvdt_chMeasure),10,80).toFixed(1);
						break;

					case dVdt_AutoCursor:
						CdVdt_SwitchToCursor();
						var rate = CdVdt_MeasureAutoCursor(v, cdvdt_RatePoint[i], 10, 90);
						CdVdt_TekMeasurement(1);
						break;
				}

				TEK_Busy();

				dVdt_err = ((rate - cdvdt_RatePoint[i]) / cdvdt_RatePoint[i] * 100).toFixed(1);
				V_err = ((v - VoltageArray[k]) / VoltageArray[k] * 100).toFixed(1)

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
				CdVdt_StoreVoltageAndFixRate(cdvdt_RatePoint[i], rate, VoltageArray[k], v);
				
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
	var ConfiguredRate, RateErr, RateSet;
	var VoltageErr = ((VoltageScope - Voltage) / Voltage * 100).toFixed(1);
	
	RateErr = ((RateScope - Rate) / Rate * 100).toFixed(1);
	cdvdt_scatter05.push(RateScope + ";" + RateErr + ";" + Voltage + ";" + VoltageScope + ";" + VoltageErr);
	
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
	cdvdt_ratesc = [];
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

function CdVdt_ResourceTest(Repeat)
{
	CdVdt_ResetA();
	
	var VoltageArray = CGEN_GetRange(cdvdt_Vmin, cdvdt_Vmax, cdvdt_Vstp);
	var random = 0;
	var cntDone = 0;
	var cntFailedVerify = 0;
	var cntTotal = VoltageArray.length * cdvdt_RatePoint.length * Repeat;
	
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
	
	for (var counter = 0; counter < Repeat; counter++)
	{
		for (var k = 0; k < VoltageArray.length; k++)
		{
			dev.w(128, VoltageArray[k]);
			for (var i = 0; i < cdvdt_RatePoint.length; i++)
			{
				sleep(1000);
				dev.w(129, cdvdt_RatePoint[i] * cdvdt_DeviderRate)

				dev.w(150, random);
				dev.c(117);

				sleep(1000);
				p("random = " + random);

				dev.c(100);
				sleep(1000);
				while(_dVdt_Active()) sleep(50);
				
				
				print("dVdt set,  V/us: " + cdvdt_RatePoint[i]);
				print("Vset,         V: " + VoltageArray[k]);
				if (dev.r(197) == 2)
					print("Test Failed");
				else if (dev.r(197) == 1)
					print("Test OK");
				cntDone++;
				print("-- result " + cntDone + " of " + cntTotal + " --");

				if((random == 1 && dev.r(197) == 1) || (random == 0 && dev.r(197) == 2))
					cntFailedVerify++;
				
				print("Кол-во неудачных тестов = " + cntFailedVerify);

				random = Math.round(Math.random())
				if (anykey())
				{
					print("Stopped from user!");
					return;
				}

			}
		}
	}
	// Power disable
	dev.w(150, 0);
	dev.c(117);
	dev.c(2);
	print("Кол-во неудачных тестов = " + cntFailedVerify);
}

function CdVdt_CollectdVdt(Repeat)
{
	CdVdt_ResetA();
	
	var VoltageArray = CGEN_GetRange(cdvdt_Vmin, cdvdt_Vmax, cdvdt_Vstp);
	
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
