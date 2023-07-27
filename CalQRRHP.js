include("Tektronix.js");
include("TestQRRHP.js")
include("Sic_GetData.js")

// Calibration setup parameters
cal_Rshunt = 999;	// uOhm
DirectCurrentTest = 500; // in A
DirectVoltageTest = 1500; // in V
DirectVoltageRateTest = 1000; // in V/us
//
SetCurrentTest = [100, 200, 300, 400, 500]; // in A
CurrentRateTest = [1, 1.5, 2, 5, 10, 15, 20, 30, 50, 60]; // in A/us
IrrMeasured = [35, 47, 60, 110, 180, 225, 265, 330, 425, 460, 530]; // in A
CurrentRateStartTestIndex = 0;
CurrentRateFinishTestIndex = 10;
CurrentSetStartTestIndex = 0;
CurrentSetFinishTestIndex = 4;
//
QrrGOST = 0;
//
cal_Iterations = 1;
//		

// Counters
cal_CntTotal = 0;
cal_CntDone = 0;

// Channels
cal_chMeasureI = 1;
cal_chMeasureU = 3;

// Results storage
cal_Trr = [];
cal_Irr = [];
cal_Qrr = [];
cal_Tq = [];

// Tektronix data
cal_TrrSc = [];
cal_IrrSc = [];
cal_QrrSc = [];
cal_TqSc = [];

// Relative error
cal_TrrErr = [];
cal_IrrErr = [];
cal_QrrErr = [];
cal_TqErr = [];

// Data arrays
cdidt_scatter = [];

function CAL_Init(portDevice, portTek, channelMeasureI, channelMeasureU)
{
	if (channelMeasureI < 1 || channelMeasureU > 4)
	{
		print("Wrong channel numbers");
		return;
	}

	// Copy channel information
	cal_chMeasureI = channelMeasureI;
	cal_chMeasureU = channelMeasureU;

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

function CAL_VerifyTq()
{		
	CAL_ResetA();
	
	dev.w(153,1);
	dev.c(110);
	
	// Tektronix init
	CAL_TekInitTq();

	if (CAL_CollectTq(cal_Iterations))
	{
		CAL_SaveTq("QSU_Tq");
		
		// Plot relative error distribution
		scattern(cal_TqSc, cal_TqErr, "Tq (in us)", "Error (in %)", "Tq relative error");
	}
	
	dev.c(111);
}
//--------------------

function CAL_VerifyQrr()
{		
	CAL_ResetA();
	
	dev.w(153,1);
	dev.c(110);
	
	// Tektronix init
	CAL_TekInitQrr();

	if (CAL_CollectQrr(cal_Iterations))
	{
		CAL_SaveIrr("QSU_Irr");
		CAL_SaveTrr("QSU_Trr");
		CAL_SaveQrr("QSU_Qrr");
		
		// Plot relative error distribution
		scattern(cal_IrrSc, cal_IrrErr, "Irr (in A)", "Error (in %)", "Irr relative error");
		scattern(cal_TrrSc, cal_TrrErr, "Trr (in us)", "Error (in %)", "Trr relative error");
		scattern(cal_QrrSc, cal_QrrErr, "Qrr (in uQ)", "Error (in %)", "Qrr relative error");
	}
	
	dev.c(111);
}
//--------------------

function CAL_CollectTq(IterationsCount)
{
	cal_CntTotal = CurrentRateTest.length * IterationsCount;
	cal_CntDone = 1;
	
	for (var i = 0; i < IterationsCount; i++)
	{
		for (var j = 0; j < CurrentRateTest.length; j++)
		{
			print("-- result " + cal_CntDone++ + " of " + cal_CntTotal + " --");
			//
			
			do
			{
				qrr_print = 0;			
				QRR_Start(1, DirectCurrentTest, CurrentRateTest[j], DirectVoltageTest, DirectVoltageRateTest)
				qrr_print = 1;
				
				print("Is cursor set (y - yes, n -no, s - Stop process)?");
				
				var key = "";
				while(key != "y" && key != "n" && key != "s")
				{
					key = readkey();
					sleep(100);
				}
				
				if(key == "s")
					return 0;
			}
			while(key != "y")
			
			// Unit data
			var Tq = dev.r(213) / 10;			
			cal_Tq.push(Tq);
			print("Tq, us	 : " + Tq);

			// Scope data
			var TqSc = CAL_MeasureTq(cal_chMeasureI);
			cal_TqSc.push(TqSc);
			print("TqTek, us : " + TqSc);
			
			// Relative error
			var TqErr = ((Tq - TqSc) / TqSc * 100).toFixed(2);
			cal_TqErr.push(TqErr);
			print("TqErr, %  : " + TqErr);
			
			print("--------------------");
			
			if (anykey()) return 0;
		}
	}

	return 1;
}
//--------------------

function CAL_CollectQrr(IterationsCount)
{
	cal_CntTotal = CurrentRateTest.length * IterationsCount;
	cal_CntDone = 1;
	
	for (var i = 0; i < IterationsCount; i++)
	{
		for (var j = 0; j < CurrentRateTest.length; j++)
		{
			print("-- result " + cal_CntDone++ + " of " + cal_CntTotal + " --");
			//
			CAL_HorizontalScale(CurrentRateTest[j]);
			CAL_TekScale(cal_chMeasureI, IrrMeasured[j] * cal_Rshunt / 1e6);
			sleep(1000);
			
			qrr_print = 0;
			qrr_single = 1;
			
			QRR_Start(0, DirectCurrentTest, CurrentRateTest[j], DirectVoltageTest, DirectVoltageRateTest)
			
			qrr_print = 1;
			qrr_single = 0;
			
			// Unit data
			var Qrr = Qrr = dev.r(216) / 10;
			if(QrrGOST)
				Qrr = dev.r(210) / 10;				
			cal_Qrr.push(Qrr);
			
			var Irr = dev.r(211) / 10;
			cal_Irr.push(Irr);
			
			var Trr = dev.r(212) / 10;
			cal_Trr.push(Trr);
			

			// Scope data
			var ScopeData = CAL_MeasureQrr(cal_chMeasureI);
			var IrrSc = parseFloat(ScopeData[0]).toFixed(2);
			var TrrSc = parseFloat(ScopeData[1]).toFixed(2);
			var QrrSc = parseFloat(ScopeData[2]).toFixed(2);
			if(QrrGOST)
				QrrSc = parseFloat(ScopeData[3]).toFixed(2);			
			cal_IrrSc.push(IrrSc);
			cal_TrrSc.push(TrrSc);
			cal_QrrSc.push(QrrSc);
			
			
			// Relative error
			var IrrErr = ((Irr - IrrSc) / IrrSc * 100).toFixed(2);
			var TrrErr = ((Trr - TrrSc) / TrrSc * 100).toFixed(2);
			var QrrErr = ((Qrr - QrrSc) / QrrSc * 100).toFixed(2);
			
			cal_IrrErr.push(IrrErr);
			cal_TrrErr.push(TrrErr);
			cal_QrrErr.push(QrrErr);
			
			
			
			
			// Print results
			print("");
			print("Irr, A	 : " + Irr);
			print("IrrTek,  A: " + IrrSc);
			print("IrrErr,  %: " + IrrErr);
			print("");
			print("Trr, us	 : " + Trr);
			print("TrrTek, us: " + TrrSc);
			print("TrrErr,  %: " + TrrErr);
			print("");
			print("Qrr, uQ	 : " + Qrr);
			print("QrrTek, uQ: " + QrrSc);
			print("QrrErr,  %: " + QrrErr);
			print("--------------------");
			
			if (anykey()) return 0;
		}
	}

	return 1;
}
//--------------------

function QRR_TestPSVoltage()
{
	cdvdt_scatter = [];
	for (var i = 1; i <= 4; i++)
	{
		TEK_ChannelOff(i);
	}
	TEK_ChannelOn(cal_chMeasureI);
	//---------------
	TEK_Send("measurement:meas" + cal_chMeasureI + ":source ch" + cal_chMeasureI);
	TEK_Send("measurement:meas" + cal_chMeasureI + ":type pk2pk");
	TEK_Send("measurement:meas1:source ch" + cal_chMeasureI);
	TEK_Send("measurement:meas1:type pk2pk");	
	TEK_Send("measurement:meas2:source ch" + cal_chMeasureI);
	TEK_Send("measurement:meas2:type fall");
	//--------------
	TEK_Horizontal("1e-6", "0");
		
	cal_CntTotalRate = (CurrentRateFinishTestIndex - CurrentRateStartTestIndex + 1);
	cal_CntTotalSet = (CurrentSetFinishTestIndex - CurrentSetStartTestIndex + 1);
	cal_CntTotal = cal_CntTotalRate * cal_CntTotalSet;
	cal_CntDone = 1;
	
	for (var i = CurrentSetStartTestIndex; i <= CurrentSetFinishTestIndex; i++)
	{	
		TEK_ChannelInit(cal_chMeasureI, "1", ((SetCurrentTest[i] * cal_Rshunt * 1e-6) * 2) / 6);
		TEK_Send("ch" + cal_chMeasureI + ":position 0");
		
		TEK_TriggerInit(cal_chMeasureI, (SetCurrentTest[i] * cal_Rshunt * 1e-6) / 2);
		TEK_Send("trigger:main:edge:slope fall");
		
		for (var j = CurrentRateStartTestIndex; j <= CurrentRateFinishTestIndex; j++)
		{
			CAL_QRRHorizontalScale(SetCurrentTest[i], CurrentRateTest[j]);
			print("-- result " + cal_CntDone++ + " of " + cal_CntTotal + " --");
			sleep(3000);
			
			QRR_Start(0, SetCurrentTest[i], CurrentRateTest[j], 100, 10);
		
			print("Set current, A : " + SetCurrentTest[i]);
			print("Set current rate, A/us : " + CurrentRateTest[j]);
			print("INT_PS_VOLTAGE DCU, V : " + QSU_ReadReg(160,201) / 10);
			print("INT_PS_VOLTAGE RCU, V : " + QSU_ReadReg(170,201) / 10);
			
			//CAL_QRRdidt(SetCurrentTest[i], CurrentRateTest[j]);
			
			CAL_MeasureIrate(CurrentRateTest[j], SetCurrentTest[i]);
			
			if (anykey()) return 0;
			sleep(500);
		}
	}
	save("data/didt_404.csv", cdidt_scatter);	
}

function CAL_QRRHorizontalScale(Current,CurrentRate)
{
	TEK_Horizontal(CAL_QRRTimeScale(Current,CurrentRate), (Current / 2) / CurrentRate * 1e-6);
}

function CAL_QRRTimeScale(Current,CurrentRate)
{
	OSC_K = 2;
	OSC_TimeScale = ((Current * 2 / CurrentRate) / 10) * 1e-6;
	return OSC_TimeScale * OSC_K
}

function CAL_MeasureIrate(RateSet, CurrentSet)
{
	var RateScope = (TEK_Measure(cal_chMeasureI) * 0.8 / cal_Rshunt * 1e6 / TEK_Exec("measurement:meas2:value?") * 1e-6).toFixed(3);	
	var RateErr = ((RateScope - RateSet) / RateSet * 100).toFixed(3);
	
	var CurrentScope = ((TEK_Measure(cal_chMeasureI) / 2) / (cal_Rshunt * 1e-6)).toFixed(3);
	var CurrentErr = ((CurrentScope - CurrentSet) / CurrentSet * 100).toFixed(3);
	
	cdidt_scatter.push(RateSet + ";" + RateScope + ";" + RateErr + ";" + CurrentSet + ";" + CurrentScope + ";" + CurrentErr);
	
	print("current osc, A = " + CurrentScope);	
	print("current error, % = " + CurrentErr);
	
	print("didt osc, A/us = " + RateScope);	
	print("didt error, % = " + RateErr);	
}

function CAL_QRRdidt(Current,CurrentRate)
{
	var ctou_tgd_u = 0;
	var ctou_tgd_u90 = 0;
	var ctou_tgd_u10 = 0;
	var ctou_tgd_u_err = 0;
	var ctou_tgd_u_preverr = 0;	

	var ctou_tgd_integral = 0;
	var ctou_tgd_derivative = 0;

	var ctou_tgd_kp = 1e-4;
	var ctou_tgd_ki = 9e-4;
	var ctou_tgd_kd = 1e-4;
	
	var cursor_place = -1.4 * (Current / 2) / CurrentRate * 1e-6;
	TEK_Send("cursor:vbars:position1 " + cursor_place);
	TEK_Send("cursor:vbars:position2 " + cursor_place);
	
	ctou_tgd_u = Current * cal_Rshunt * 1e-6;
	ctou_tgd_u90 = (Current * cal_Rshunt * 1e-6) * 0.9;
	ctou_tgd_u10 = -(Current * cal_Rshunt * 1e-6) * 0.9;
	
	ctou_tgd_u.toFixed(1);
	ctou_tgd_u90.toFixed(1);
	ctou_tgd_u10.toFixed(1);
	
	while(ctou_tgd_u > ctou_tgd_u90)
	{
		// ПИД регулятор
		ctou_tgd_u_err = ctou_tgd_u - ctou_tgd_u90;

		ctou_tgd_integral = ctou_tgd_integral + ctou_tgd_u_err * ctou_tgd_ki;

		ctou_tgd_derivative = ctou_tgd_u_err - ctou_tgd_u_preverr;

		ctou_tgd_u_preverr = ctou_tgd_u_err;

		cursor_place_fixed = (ctou_tgd_u_err * ctou_tgd_kp + ctou_tgd_integral * ctou_tgd_ki + ctou_tgd_derivative * ctou_tgd_kd) / CurrentRate;
		//-----------------

		//Если cursor_place_fixed будет выдавать значения менее 10нс, то принудительно сделать шаг 10нс. Иначе при очень маленькой ошибке курсор замирает на долгое время
		if(cursor_place_fixed < 1e-8)
			cursor_place_fixed = 1e-8;

		// Корректировка, отправка нового положения курсора и измерение напряжения в этой точке
		cursor_place = cursor_place_fixed + cursor_place;
		// p("cursor_place " + cursor_place * 1e6);
		TEK_Send("cursor:vbars:position1 " + cursor_place);
		ctou_tgd_u = parseFloat(TEK_Exec("cursor:vbars:hpos1?"));
		ctou_tgd_u.toFixed(1);

		if (anykey()) return 0;
	}
	
	cursor_place = Current / CurrentRate * 1e-6;
	TEK_Send("cursor:vbars:position2 " + cursor_place);
	while(ctou_tgd_u > ctou_tgd_u10)
	{
		// ПИД регулятор
		ctou_tgd_u_err = ctou_tgd_u - ctou_tgd_u10;

		ctou_tgd_integral = ctou_tgd_integral + ctou_tgd_u_err * ctou_tgd_ki;

		ctou_tgd_derivative = ctou_tgd_u_err - ctou_tgd_u_preverr;

		ctou_tgd_u_preverr = ctou_tgd_u_err;

		cursor_place_fixed = (ctou_tgd_u_err * ctou_tgd_kp + ctou_tgd_integral * ctou_tgd_ki + ctou_tgd_derivative * ctou_tgd_kd) / CurrentRate;
		//-----------------

		//Если cursor_place_fixed будет выдавать значения менее 10нс, то принудительно сделать шаг 10нс. Иначе при очень маленькой ошибке курсор замирает на долгое время
		if(cursor_place_fixed < 1e-8)
			cursor_place_fixed = 1e-8;

		// Корректировка, отправка нового положения курсора и измерение напряжения в этой точке
		cursor_place = cursor_place_fixed + cursor_place;
		//p("cursor_place " + cursor_place * 1e6);
		TEK_Send("cursor:vbars:position2 " + cursor_place);
		ctou_tgd_u = parseFloat(TEK_Exec("cursor:vbars:hpos2?"));
		ctou_tgd_u.toFixed(1);

		if (anykey()) return 0;
	}

	var U1 = TEK_Exec("cursor:vbars:hpos1?");
	var U2 = TEK_Exec("cursor:vbars:hpos2?");
	var dT = TEK_Exec("cursor:vbars:delta?");
	
	var didt = ((U1 - U2) / dT) * 1e-3;	
	
	print("didt osc = " + didt.toFixed(2));
	
	print("didt relative error, % = " + ((didt - CurrentRate) / CurrentRate * 100).toFixed(2));
	
}

function CAL_MeasureQrr(Channel)
{
	var CurrentScale = 0, Current = 0, IntegratedCurrent = 0;
	var Index0 = 0, Index09 = 0, Index025 = 0, IndexIrr = 0, IndexTrr = 0;
	var k = 0, b = 0, TimeFraction;
	var Result = [];
	var ResultIrr, ResultTrr, ResultQrr, ResultQrrGOST;
	
	// Get waveform
	CurrentScale = 1 / cal_Rshunt * 1e6;
	Current = SiC_GD_Filter(SiC_GD_GetChannelCurve(Channel), CurrentScale);
	
	TimeFraction = SiC_GD_GetTimeScale() / 250 * 1e9  / 1000;
	
	// Searching zero crossing point
	for(i = 0; i < Current.length; i++)
	{
		if(Current[i] < 0)
		{
			Index0 = i;
			break;
		}
	}
	
	// Searching Irr point
	for(i = Index0; i < Current.length; i++)
	{
		if(Current[i] < Current[IndexIrr])
			IndexIrr = i;
	}
	
	// Searching Irr * 0.9 point
	for(i = IndexIrr; i < Current.length; i++)
	{
		if(Current[i] > Current[IndexIrr] * 0.9)
		{
			Index09 = i;
			break;
		}
	}
	
	// Searching Irr * 0.25 point
	for(i = IndexIrr; i < Current.length; i++)
	{
		if(Current[i] > Current[IndexIrr] * 0.25)
		{
			Index025 = i;
			break;
		}
	}
	
	// Irr
	ResultIrr =  -Current[IndexIrr];
	
	// Trr calculate
	b = Current[Index09];
	k = (Current[Index025] - Current[Index09]) / (Index025 - Index09);
	IndexTrr = Math.round(-b / k + Index09);
	ResultTrr = ((IndexTrr - Index0) * TimeFraction).toFixed(2);
	
	// Qrr calculate
	for(i = Index0; i < IndexTrr; i++)
		IntegratedCurrent += -Current[i];
	ResultQrr = (IntegratedCurrent * TimeFraction).toFixed(2);
	ResultQrrGOST = (ResultIrr * ResultTrr / 2).toFixed(2);
	
	var ReturnValues = [];
	ReturnValues[0] = ResultIrr;
	ReturnValues[1] = ResultTrr;
	ReturnValues[2] = ResultQrr;
	ReturnValues[3] = ResultQrrGOST;
	
	return ReturnValues;
}
//--------------------

function CAL_MeasureTq(Channel)
{
	TEK_Send("cursor:select:source ch" + Channel);
	sleep(500);
	return TEK_Exec("cursor:vbars:delta?") * 1e6;
}
//--------------------

function CAL_ResetA()
{	
	// Results storage
	cal_Irr = [];
	cal_Trr = [];
	cal_Qrr = [];
	cal_Tq = [];

	// Tektronix data
	cal_IrrSc = [];
	cal_TrrSc = [];
	cal_QrrSc = [];
	cal_TqSc = [];

	// Relative error
	cal_IrrErr = [];
	cal_TrrErr = [];
	cal_QrrErr = [];
	cal_TqErr = [];
}
//--------------------

function CAL_SaveIrr(NameIrr)
{
	CGEN_SaveArrays(NameIrr, cal_Irr, cal_IrrSc, cal_IrrErr);
}
//--------------------

function CAL_SaveTrr(NameTrr)
{
	CGEN_SaveArrays(NameTrr, cal_Trr, cal_TrrSc, cal_TrrErr);
}
//--------------------

function CAL_SaveQrr(NameQrr)
{
	CGEN_SaveArrays(NameQrr, cal_Qrr, cal_QrrSc, cal_QrrErr);
}
//--------------------

function CAL_SaveTq(NameTq)
{
	CGEN_SaveArrays(NameTq, cal_Tq, cal_TqSc, cal_TqErr);
}
//--------------------

function CAL_TekInitQrr()
{
	TEK_Horizontal("1e-6", "0");
	
	TEK_ChannelInit(cal_chMeasureI, "1", "0.1");
	TEK_Send("ch" + cal_chMeasureI + ":position 3");
	
	TEK_ChannelInit(cal_chMeasureU, "100", "20");
	TEK_Send("ch" + cal_chMeasureU + ":position 3");
	
	TEK_TriggerInit(cal_chMeasureU, "-60");
	TEK_Send("trigger:main:edge:slope fall");
	
	TEK_Send("data:width 1");
	TEK_Send("data:encdg rpb");
	TEK_Send("data:start 1");
	TEK_Send("data:stop 2500");
}
//--------------------

function CAL_TekInitTq()
{
	TEK_Horizontal("10e-6", "0");
	
	TEK_ChannelInvInit(cal_chMeasureI, "1", "0.1");
	TEK_Send("ch" + cal_chMeasureI + ":position 0");
	
	TEK_ChannelInit(cal_chMeasureU, "100", "50");
	TEK_Send("ch" + cal_chMeasureU + ":position -1");
	
	TEK_TriggerInit(cal_chMeasureU, "-50");
	TEK_Send("trigger:main:edge:slope raise");
}
//--------------------

function CAL_TekScale(Channel, Value)
{
	Value = Value / 6;
	TEK_Send("ch" + Channel + ":scale " + Value);
}
//--------------------

function CAL_HorizontalScale(CurrentRate)
{
	switch(CurrentRate * 10)
	{
		case 10:
			TEK_Horizontal("10e-6", "-10e-6");
			break;
		case 15:
			TEK_Horizontal("10e-6", "-10e-6");
			break;
		case 20:
			TEK_Horizontal("10e-6", "-10e-6");
			break;
		case 50:
			TEK_Horizontal("5e-6", "-5e-6");
			break;
		case 100:
			TEK_Horizontal("5e-6", "-5e-6");
			break;
		case 150:
			TEK_Horizontal("5e-6", "-5e-6");
			break;
		case 200:
			TEK_Horizontal("5e-6", "-5e-6");
			break;
		case 300:
			TEK_Horizontal("2.5e-6", "-2.5e-6");
			break;
		case 500:
			TEK_Horizontal("2.5e-6", "-2.5e-6");
			break;
		case 600:
			TEK_Horizontal("2.5e-6", "-2.5e-6");
			break;
		case 1000:
			TEK_Horizontal("2.5e-6", "-2.5e-6");
			break;
	}
}
//--------------------