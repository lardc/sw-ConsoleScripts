include("TestTOU_HP.js")
include("Tektronix.js")
include("CalGeneral.js")

// Input params
ctou_ud_test = 1500;		// Available - 600V, 1000V, 1500V
ctou_idmax = 100;		// MAX DUT Current [A]
ctou_Ri = 1e-3;			// Current shunt resistance
//
ctou_nid = 11;			// CAN node id
ctou_TOCUHP_nid = 21;	// TOCU HP node id

// Calibrate Id
ctou_idmin = 10;
ctou_idmax = ctou_idmax;
ctou_idstp = 10;

// Calibrate Ud
ctou_id_test = 50;			// Test current [A]
ctou_UdArray = [600, 1000, 1500];

// Calibrate Time
ctou_ud = 600; // in V
ctou_ig = 2000; // in mA
ctou_id_points = 3;
ctou_Rshunt_gate = 2; // Gate current shunt resistance, in Ohm
ctou_rise_time_ig = 0.000001;
EUosc = 3;
ETosc = 0.5;
EProbe = 2;

// Counters
ctou_cntTotal = 0;
ctou_cntDone = 0;

// Iterations
ctou_Iterations = 1;

// Channels
ctou_chMeasureI = 1;
ctou_chMeasureU = 2;
ctou_chSync = 3;

ctou_id_array = [];
ctou_ud_array = [];

// Results storage
ctou_id = [];
ctou_id_set = [];
ctou_ud = [];
ctou_tgd = [];
ctou_tgt = [];

// Tektronix data
ctou_id_sc = [];
ctou_ud_sc = [];
ctou_tgd_sc = [];
ctou_tgt_sc = [];

// Relative error
ctou_id_err = [];
ctou_idset_err = [];
ctou_ud_err = [];
ctou_tgd_err = [];
ctou_tgt_err = [];

// Summary error
ctou_tgd_err_sum = [];
ctou_tgt_err_sum = [];

// Correction
ctou_id_corr = [];
ctou_id_set_corr = [];
ctou_ud_corr = [];
ctou_tgd_corr = [];
ctou_tgt_corr = [];

ctou_UseAvg = 1;

function CTOU_Init(portTOU, portTek, channelMeasureI, channelMeasureU, channelSync)
{
	// Init Tektronix
	TEK_PortInit(portTek);
	TEK_Send("RECAll:SETUp FACtory");

	if (channelMeasureI < 1 || channelMeasureI > 4 || 
		channelMeasureU < 1 || channelMeasureU > 4 ||
		channelSync < 1 || channelSync > 4)
	{
		print("Wrong channel numbers");
		return;
	}

	// Copy channel information
	ctou_chMeasureU = channelMeasureU;
	ctou_chMeasureI = channelMeasureI;
	ctou_chSync = channelSync;

	// Init TOU
	dev.Disconnect();
	dev.Connect(portTOU);
}

function CTOU_СalibrateId()
{
	dev.nid(ctou_nid);
	
	CTOMU_CommutationControl(0);
	
	// Collect data
	CTOU_ResetA();
	CTOU_ResetIdCal();
	
	// Tektronix init
	CTOU_IdTekInit();

	// Reload values
	var CurrentArray = CGEN_GetRange(ctou_idmin, ctou_idmax, ctou_idstp);

	if (CTOU_IdCollect(CurrentArray, ctou_Iterations))
	{
		CTOU_SaveId("touhp_id");
		CTOU_SaveIdset("touhp_idset");

		// Plot relative error distribution
		scattern(ctou_id_sc, ctou_id_err, "Current (in A)", "Error (in %)", "Current relative error");
		sleep(200);
		scattern(ctou_id_set, ctou_idset_err, "Current (in A)", "Error (in %)", "Current setpoint relative error");

		// Calculate correction
		ctou_id_corr = CGEN_GetCorrection2("touhp_id");
		CTOU_CalId(ctou_id_corr[0], ctou_id_corr[1], ctou_id_corr[2]);
		CTOU_PrintIdCal();
		
		ctou_id_set_corr = CGEN_GetCorrection2("touhp_idset");
		CTOU_CalId_Set(ctou_id_set_corr[0], ctou_id_set_corr[1], ctou_id_set_corr[2]);
		CTOU_PrintIdSetCal();
	}
	
	CTOMU_CommutationControl(1);
}

function CTOU_СalibrateUd()
{
	dev.nid(ctou_nid);
	
	CTOMU_CommutationControl(1);
	
	// Collect data
	CTOU_ResetA();
	CTOU_ResetUdCal();
	
	// Tektronix init
	CTOU_UdTekInit();

	if (CTOU_UdCollect(ctou_UdArray, ctou_Iterations))
	{
		CTOU_SaveUd("touhp_ud");

		// Plot relative error distribution
		scattern(ctou_ud, ctou_ud_err, "Voltage (in V)", "Error (in %)", "Volatge setpoint relative error");

		// Calculate correction
		ctou_ud_corr = CGEN_GetCorrection2("touhp_ud");
		CTOU_CalUd(ctou_ud_corr[0], ctou_ud_corr[1], ctou_ud_corr[2]);
		CTOU_PrintUdCal();
	}
}

function CTOU_CalibrateTgd() 
{
	// Collect data
	CTOU_ResetA();
	CTOU_ResetTgdCal();

	// Tektronix init
	CTOU_TimeTekInit();

	// Reload values
	var CurrentArray = CGEN_GetRangeLogarithm(ctou_idmin, ctou_idmax, ctou_id_points);

	if (CTOU_TimeCollect(CurrentArray, ctou_Iterations))
	{
		CTOU_SaveTgd("tou_tgd_fixed");
		
		// Plot relative error distribution
		scattern(ctou_tgd_sc, ctou_tgd_err, "Tgd (in us)", "Error (in %)", "Tgd relative error");
		scattern(ctou_tgt_sc, ctou_tgt_err, "Tgt (in us)", "Error (in %)", "Tgt relative error");

		// Plot summary error distribution
		scattern(ctou_tgd_sc, ctou_tgd_err_sum, "Tgd (in us)", "Error (in %)", "Tgd summary error");
		scattern(ctou_tgt_sc, ctou_tgt_err_sum, "Tgt (in us)", "Error (in %)", "Tgt_Sum_Err summary error");
		
		// Calculate correction
		ctou_tgd_corr = CGEN_GetCorrection2("tou_tgd_fixed");
		CTOU_CalTgd(ctou_tgd_corr[0], ctou_tgd_corr[1], ctou_tgd_corr[2]);
		CTOU_PrintTgdCal();
	}
}

function CTOU_CalibrateTgt() 
{
	// Collect data
	CTOU_ResetA();
	CTOU_ResetTgtCal(); 

	// Tektronix init
	CTOU_TimeTekInit();

	// Reload values
	var CurrentArray = CGEN_GetRangeLogarithm(ctou_idmin, ctou_idmax, ctou_id_points);

	if (CTOU_TimeCollect(CurrentArray, ctou_Iterations))
	{
		CTOU_SaveTgt("tou_tgt_fixed");
		
		// Plot relative error distribution
		scattern(ctou_tgd_sc, ctou_tgd_err, "Tgd (in us)", "Error (in %)", "Tgd relative error");
		scattern(ctou_tgt_sc, ctou_tgt_err, "Tgt (in us)", "Error (in %)", "Tgt relative error");

		// Plot summary error distribution
		scattern(ctou_tgd_sc, ctou_tgd_err_sum, "Tgd (in us)", "Error (in %)", "Tgd summary error");
		scattern(ctou_tgt_sc, ctou_tgt_err_sum, "Tgt (in us)", "Error (in %)", "Tgt_Sum_Err summary error");
		
		// Calculate correction
		ctou_tgt_corr = CGEN_GetCorrection2("tou_tgt_fixed");
		CTOU_CalTgt(ctou_tgt_corr[0], ctou_tgt_corr[1], ctou_tgt_corr[2]);
		CTOU_PrintTgtCal();
	}
}

function CTOU_VerifyId()
{
	dev.nid(ctou_nid);
	
	CTOMU_CommutationControl(0);
	
	// Collect data
	CTOU_ResetA();
	
	// Tektronix init
	CTOU_IdTekInit();

	// Collect data
	var CurrentArray = CGEN_GetRange(ctou_idmin, ctou_idmax, ctou_idstp);
	var ArrayDiag = '# Current array: '
	for(var i = 0; i < CurrentArray.length; i++)
		ArrayDiag += CurrentArray[i] + '; '
	p(ArrayDiag)

	if (CTOU_IdCollect(CurrentArray, ctou_Iterations))
	{
		CTOU_SaveId("tou_i_fixed");
		CTOU_SaveIdset("tou_iset_fixed");

		// Plot relative error distribution
		scattern(ctou_id_sc, ctou_id_err, "Current (in A)", "Error (in %)", "Current relative error");
		sleep(200);
		scattern(ctou_id_set, ctou_idset_err, "Current (in A)", "Error (in %)", "Current setpoint relative error");
	}
	
	CTOMU_CommutationControl(1);
}

function CTOU_VerifyUd()
{	
	dev.nid(ctou_nid);
	
	CTOMU_CommutationControl(1);
	
	// Collect data
	CTOU_ResetA();
	
	// Tektronix init
	CTOU_UdTekInit();

	if (CTOU_UdCollect(ctou_UdArray, ctou_Iterations))
	{
		CTOU_SaveUd("tou_ud_fixed");

		// Plot relative error distribution
		scattern(ctou_ud, ctou_ud_err, "Voltage (in V)", "Error (in %)", "Voltage setpoint relative error");
	}
}

function CTOU_VerifyTime()
{
	// Collect data
	CTOU_ResetA();

	// Tektronix init
	CTOU_TimeTekInit();

	// Reload values
	var CurrentArray = CGEN_GetRangeLogarithm(ctou_idmin, ctou_idmax, ctou_id_points);

	if (CTOU_TimeCollect(CurrentArray, ctou_Iterations))
	{
		CTOU_SaveTgd("tou_tgd_fixed");
		CTOU_SaveTgt("tou_tgt_fixed");
		
		// Plot relative error distribution
		scattern(ctou_tgd_sc, ctou_tgd_err, "Tgd (in us)", "Error (in %)", "Tgd relative error");
		scattern(ctou_tgt_sc, ctou_tgt_err, "Tgt (in us)", "Error (in %)", "Tgt relative error");

		// Plot summary error distribution
		scattern(ctou_tgd_sc, ctou_tgd_err_sum, "Tgd (in us)", "Error (in %)", "Tgd summary error");
		scattern(ctou_tgt_sc, ctou_tgt_err_sum, "Tgt (in us)", "Error (in %)", "Tgt_Sum_Err summary error");
	}
}

function CTOU_IdTekInit()
{
	// Init channels
	TEK_ChannelInit(ctou_chMeasureI, "1", "0.01");
	TEK_ChannelInit(ctou_chSync, "1", "1");
	// Init trigger
	TEK_TriggerInit(ctou_chSync, "4");
	// Horizontal settings
	TEK_Horizontal("2.5e-6", "7.5e-6");
	
		// Display channels
	for (var i = 1; i <= 4; i++)
	{
		if (i == ctou_chMeasureI || i == ctou_chSync)
			TEK_ChannelOn(i);
		else
			TEK_ChannelOff(i);
	}

	CTOU_IdTekCursor(ctou_chMeasureI);
	// Init measurement
	CTOU_Measure(ctou_chMeasureI, "4");
}

function CTOU_UdTekInit()
{
	// Init channels
	TEK_ChannelInit(ctou_chMeasureU, "1000", "100");
	TEK_ChannelInit(ctou_chSync, "1", "1");
	// Init trigger
	TEK_TriggerInit(ctou_chSync, "4");
	// Horizontal settings
	TEK_Horizontal("2.5e-6", "0");
	
		// Display channels
	for (var i = 1; i <= 4; i++)
	{
		if (i == ctou_chMeasureU || i == ctou_chSync)
			TEK_ChannelOn(i);
		else
			TEK_ChannelOff(i);
	}

	CTOU_UdTekCursor(ctou_chMeasureU);
	// Init measurement
	CTOU_Measure(ctou_chMeasureU, "4");
}

function CTOU_TimeTekInit()
{
	// Init channels
	TEK_ChannelInit(ctou_chMeasureI, "1", "0.8"); // для тока управления 2 А на шунте 2 Ом
	TEK_ChannelInit(ctou_chMeasureU, "100", "85");
	TEK_ChannelInit(ctou_chSync, "1", "1");
	// Init trigger
	TEK_TriggerInit(ctou_chSync, "4");
	// Horizontal settings
	TEK_Horizontal("10e-6", "40e-6"); // должен помещаться спадающий фронт в 50 мкс

	// Display channels
	for (var i = 1; i <= 4; i++)
	{
		if (i == ctou_chMeasureI || i == ctou_chMeasureU || i == ctou_chSync)
			TEK_ChannelOn(i);
		else
			TEK_ChannelOff(i);
	}
	
	// Init measurement
	TEK_MeasFallTimeInit(ctou_chMeasureU, 1);
	TEK_MeasMaxInit(ctou_chMeasureI, 2);
	TEK_MeasMaxInit(ctou_chMeasureU, 3);
}

function CTOU_IdTekCursor(Channel)
{
	TEK_Send("cursor:select:source ch" + Channel);
	TEK_Send("cursor:function vbars");
	TEK_Send("cursor:vbars:position1 12.5e-6");
	TEK_Send("cursor:vbars:position2 12.5e-6");
}

function CTOU_UdTekCursor(Channel)
{
	TEK_Send("cursor:select:source ch" + Channel);
	TEK_Send("cursor:function vbars");
	TEK_Send("cursor:vbars:position1 -2.5e-6");
	TEK_Send("cursor:vbars:position2 -2.5e-6");
}

function CTOU_Measure(Channel, Resolution)
{
	TEK_Send("cursor:select:source ch" + Channel);
	sleep(500);

	var f = TEK_Exec("cursor:vbars:hpos2?");
	if (Math.abs(f) > 2e+4)
		f = 0;
	return parseFloat(f).toFixed(Resolution);
}

function CTOU_MeasureAutoCursor(VoltageIg, VoltageUd)
{
	// Вычисление уровней 10 % тока управления и 10 % и 90 % анодного напряжения 
	var ctou_u_ig_10 = VoltageIg * 0.1;
	var ctou_ud_10 = VoltageUd * 0.1;
	var ctou_ud_90 = VoltageUd * 0.9;

	// Вычисление ошибки для автонастройки курсоров
	var ctou_u_ig_10_err_high = ctou_u_ig_10 * 1.3;
	var ctou_u_ig_10_err_low = ctou_u_ig_10 * 0.8;

	var ctou_ud_10_err_high = ctou_ud_10 * 1.3;
	var ctou_ud_10_err_low = ctou_ud_10 * 0.8;

	var ctou_ud_90_err_high = ctou_ud_90 * 1.3;
	var ctou_ud_90_err_low = ctou_ud_90 * 0.8;

	// Включение курсоров
	var ctou_timescale = parseFloat(TEK_Exec("horizontal:main:scale?"));
	var ctou_pos_cursor2 = ctou_timescale * 4;
	var ctou_pos_cursor1 = 0;
	TEK_CursorTimeInit(ctou_chMeasureI);
	TEK_CursorTimeРosition(ctou_chMeasureI, ctou_pos_cursor1, ctou_pos_cursor2);
	
	var ctou_timestep = ctou_timescale / 25;
	var ctou_u_err = 0;

	// Проверка расположения курсоров
	var ctou_u_cursor1 = TEK_MeasureCursor(1);
	var ctou_u_cursor2 = TEK_MeasureCursor(2);
	if (ctou_u_cursor1 > 10e+6 || ctou_u_cursor2 > 10e+6)
	{
		print("Measurement error on cursors");
		return 0;
	}

	else
	{
		// Настройка курсора, уровень 10 % тока управления
		while(ctou_u_cursor1 > ctou_u_ig_10_err_high || ctou_u_cursor1 < ctou_u_ig_10_err_low)
		{
			ctou_u_err = (ctou_u_cursor1 - ctou_u_ig_10).toFixed(2);
			if(ctou_u_err > 0)
			{
				ctou_pos_cursor1 = ctou_pos_cursor1 - ctou_timestep;
				TEK_Send("cursor:select:source ch" + ctou_chMeasureI);
				TEK_Send("cursor:vbars:position1 " + ctou_pos_cursor1);
			}
			else
			{
				ctou_pos_cursor1 = ctou_pos_cursor1 + ctou_timestep;
				TEK_Send("cursor:select:source ch" + ctou_chMeasureI);
				TEK_Send("cursor:vbars:position1 " + ctou_pos_cursor1);
			}
			ctou_u_cursor1 = TEK_MeasureCursor(1);
			if (anykey()) return 0;
		}

		// Настройка курсора, уровнь 90 % анодного напряжения
		while(ctou_u_cursor2 > ctou_ud_90_err_high || ctou_u_cursor2 < ctou_ud_90_err_low)
		{
			ctou_u_err = (ctou_u_cursor2 - ctou_ud_90).toFixed(2);
			if(ctou_u_err > 0)
			{
				ctou_pos_cursor2 = ctou_pos_cursor2 + ctou_timestep;
				TEK_Send("cursor:select:source ch" + ctou_chMeasureU);
				TEK_Send("cursor:vbars:position2 " + ctou_pos_cursor2);
			}
			else
			{
				ctou_pos_cursor2 = ctou_pos_cursor2 - ctou_timestep;
				TEK_Send("cursor:select:source ch" + ctou_chMeasureU);
				TEK_Send("cursor:vbars:position2 " + ctou_pos_cursor2);
			}
			ctou_u_cursor2 = TEK_MeasureCursor(2);
			if (anykey()) return 0;
		}
		
		var Tgd = TEK_MeasureCursorDelta();

		// Настройка курсора, уровень 10 % анодного напряжения
		while(ctou_u_cursor2 > ctou_ud_10_err_high || ctou_u_cursor2 < ctou_ud_10_err_low)
		{
			ctou_u_err = (ctou_u_cursor2 - ctou_ud_10).toFixed(2);
			if(ctou_u_err > 0)
			{
				ctou_pos_cursor2 = ctou_pos_cursor2 + ctou_timestep;
				TEK_Send("cursor:select:source ch" + ctou_chMeasureU);
				TEK_Send("cursor:vbars:position2 " + ctou_pos_cursor2);
			}
			else
			{
				ctou_pos_cursor2 = ctou_pos_cursor2 - ctou_timestep;
				TEK_Send("cursor:select:source ch" + ctou_chMeasureU);
				TEK_Send("cursor:vbars:position2 " + ctou_pos_cursor2);
			}
			ctou_u_cursor2 = TEK_MeasureCursor(2);

			if (anykey()) return 0;
		}

		var Tgt = TEK_MeasureCursorDelta();
	
		return [Tgd, Tgt];
	}
}

function CTOU_IdCollect(CurrentValues, IterationsCount)
{
	ctou_cntTotal = IterationsCount * CurrentValues.length;
	ctou_cntDone = 1;

	var AvgNum;
	if (ctou_UseAvg)
	{
		AvgNum = 4;
		TEK_AcquireAvg(AvgNum);
	}
	else
	{
		AvgNum = 1;
		TEK_AcquireSample();
	}
	
	for (var i = 0; i < IterationsCount; i++)
	{
		for (var j = 0; j < CurrentValues.length; j++)
		{
			print("-- result " + ctou_cntDone++ + " of " + ctou_cntTotal + " --");
			
			CTOU_TekScale(ctou_chMeasureI, CurrentValues[j] * ctou_Ri);
			TEK_TriggerInit(ctou_chSync, 4);
			sleep(1000);

			var tou_print_copy = tou_print;
			tou_print = 0;
			for (var k = 0; k < AvgNum; k++)
				TOUHP_Measure(ctou_ud_test, CurrentValues[j] * 10);
			tou_print = tou_print_copy;
			
			// Set data
			var id_set = dev.r(129);
			ctou_id_set.push(id_set);
			print("Icalc, A: " + CurrentValues[j]);
			print("Idset, A: " + (id_set / 10));
			
			// Unit data
			var id_read = dev.r(250);
			ctou_id.push(id_read);
			print("Idtou, A: " + id_read);

			// Scope data
			var id_sc = (CTOU_Measure(ctou_chMeasureI, "4") / ctou_Ri * 10).toFixed(0);
			ctou_id_sc.push(id_sc);
			print("Idtek, A: " + id_sc);

			// Relative error
			ctou_idset_err.push(((id_sc - id_set) / id_set * 100).toFixed(2));
			ctou_id_err.push(((id_read - id_sc) / id_sc * 100).toFixed(2));
			print("--------------------");
			
			if (anykey()) return 0;
		}
	}

	return 1;
}

function CTOU_UdCollect(VoltageValues, IterationsCount)
{
	ctou_cntTotal = IterationsCount * VoltageValues.length;
	ctou_cntDone = 1;

	var AvgNum;
	if (ctou_UseAvg)
	{
		AvgNum = 4;
		TEK_AcquireAvg(AvgNum);
	}
	else
	{
		AvgNum = 1;
		TEK_AcquireSample();
	}
	
	for (var i = 0; i < IterationsCount; i++)
	{
		for (var j = 0; j < VoltageValues.length; j++)
		{
			print("-- result " + ctou_cntDone++ + " of " + ctou_cntTotal + " --");
			
			CTOU_TekScale(ctou_chMeasureU, VoltageValues[j]);
			TEK_TriggerInit(ctou_chSync, 4);
			sleep(1500);

			//
			var tou_print_copy = tou_print;
			tou_print = 0;

			for (var k = 0; k < AvgNum; k++)
			{
				TOUHP_Measure(VoltageValues[j], ctou_id_test * 10);
				sleep(1000);
			}
			
			tou_print = tou_print_copy;
			
			// Set data
			var ud = dev.r(128);
			ctou_ud.push(ud);
			print("Ud, A: " + ud);

			// Scope data
			var ud_sc = Math.round(CTOU_Measure(ctou_chMeasureU, "4"));
			ctou_ud_sc.push(ud_sc);
			print("Idtek, A: " + ud_sc);

			// Relative error
			ctou_ud_err.push(((ud_sc - ud) / ud * 100).toFixed(2));
			print("--------------------");
			
			if (anykey()) return 0;
		}
	}

	return 1;
}

function CTOU_TimeCollect(CurrentValues, IterationsCount)
{
	ctou_cntTotal = IterationsCount * CurrentValues.length;
	ctou_cntDone = 1;

	var AvgNum;
	if (ctou_UseAvg)
	{
		AvgNum = 4;
		TEK_AcquireAvg(AvgNum);
	}
	else
	{
		AvgNum = 1;
		TEK_AcquireSample();
	}

	// Настройка развертки по горизонтали
	CTOU_TekHorizontal(600, 1250);
	
	for (var i = 0; i < IterationsCount; i++)
	{
		for (var j = 0; j < CurrentValues.length; j++)
		{
			print("-- result " + ctou_cntDone++ + " of " + ctou_cntTotal + " --");
			
			// Настройка развертки по вертикали
			CTOU_TekScale(ctou_chMeasureI, ctou_ig * ctou_Rshunt_gate);
			CTOU_TekScale(ctou_chMeasureU, ctou_ud);
			sleep(1000);

			var tou_print_copy = tou_print;
			tou_print = 0;
			for (var k = 0; k < AvgNum; k++)
			{
				TOUHP_Measure(ctou_ud, CurrentValues[j] * 10);
				sleep(2000);
				if(anykey())
				break;
			}
			tou_print = tou_print_copy;

			var max_u_ig = TEK_Measure(2);
			var max_ud = TEK_Measure(3);

			// Scope data
			var time_result = CTOU_MeasureAutoCursor(max_u_ig, max_ud);
			var tgd_sc = time_result[0] * 1000000;
			var tgt_sc = time_result[1] * 1000000;
			ctou_tgd_sc.push(tgd_sc);
			ctou_tgt_sc.push(tgt_sc);
			print("Tgd_tek, us: " + tgd_sc);
			print("Tgt_tek, us: " + tgt_sc);

			// Unit data
			var tgd = dev.r(251) / 1000;
			var tgt = dev.r(252) / 1000;
			ctou_tgd.push(tgd);
			ctou_tgt.push(tgt);
			print("Tgd_MME, us: " + tgd);
			print("Tgt_MME, us: " + tgt);

			// Relative error
			var tgd_err = ((tgd - tgd_sc) / tgd_sc * 100).toFixed(2);
			var tgt_err = ((tgt - tgt_sc) / tgt_sc * 100).toFixed(2);
			ctou_tgd_err.push(tgd_err);
			ctou_tgt_err.push(tgt_err);
			print("Tgd_Err, %: " + tgd_err);
			print("Tgt_Err, %: " + tgt_err);

			// Summary error
			var E0_tgd_tgt = 1.1 * Math.sqrt(Math.pow(EUosc, 2) + Math.pow(ETosc, 2) + Math.pow(EProbe, 2));
			var tgd_err_sum = (Math.sign_ma(tgd_err) * (Math.abs(tgd_err) + E0_tgd_tgt)).toFixed(2);
			var tgt_err_sum = (Math.sign_ma(tgt_err) * (Math.abs(tgt_err) + E0_tgd_tgt)).toFixed(2);
			ctou_tgd_err_sum.push(tgd_err_sum);
			ctou_tgt_err_sum.push(tgt_err_sum);
			print("Tgd_Sum_Err, %: " + tgd_err_sum);
			print("Tgt_Sum_Err, %: " + tgt_err_sum);
			
			if (anykey()) return 0;
		}
	}

	return 1;
}

function CTOU_TekScale(Channel, Value)
{
	Value = Value / 7;
	TEK_Send("ch" + Channel + ":scale " + Value);
}

function CTOU_TekHorizontal(VoltageValues, CurrentValues)
{
	TOUHP_Measure(VoltageValues, CurrentValues * 10, 2000, 2000);
	
	// Расчет и установка шкалы
	var ctou_fall_time_ud = parseFloat(TEK_Exec("measurement:meas2:value?"));
	var ctou_timescale = (ctou_fall_time_ud + ctou_rise_time_ig) / 5;
	TEK_Horizontal(ctou_timescale, "0");

	// Расчет и установка позиции
	var ctou_timescale = parseFloat(TEK_Exec("horizontal:main:scale?"));
	var ctou_time_pos = ctou_timescale * 4;
	TEK_Horizontal(ctou_timescale, ctou_time_pos);
}

function CTOU_ResetA()
{
	// Results storage
	ctou_id = [];
	ctou_id_set = [];
	ctou_ud = [];
	ctou_tgd = [];
	ctou_tgt = [];

	// Tektronix data
	ctou_id_sc = [];
	ctou_ud_sc = [];
	ctou_tgd_sc = [];
	ctou_tgt_sc = [];

	// Relative error
	ctou_id_err = [];
	ctou_idset_err = [];
	ctou_ud_err = [];
	ctou_tgd_err = [];
	ctou_tgt_err = [];

	// Correction
	ctou_id_corr = [];
	ctou_id_set_corr = [];
	ctou_ud_corr = [];
	ctou_tgd_corr = [];
	ctou_tgt_corr = [];

	// Summary error
	ctou_tgd_err_sum = [];
	ctou_tgt_err_sum = [];
}

function CTOU_SaveId(NameId)
{
	CGEN_SaveArrays(NameId, ctou_id, ctou_id_sc, ctou_id_err);
}

function CTOU_SaveIdset(NameIdset)
{
	CGEN_SaveArrays(NameIdset, ctou_id_sc, ctou_id_set, ctou_idset_err);
}

function CTOU_SaveUd(NameUd)
{
	CGEN_SaveArrays(NameUd, ctou_ud_sc, ctou_ud, ctou_ud_err);
}

function CTOU_SaveTgd(NameTgd)
{
	CGEN_SaveArrays(NameTgd, ctou_tgd, ctou_tgd_sc, ctou_tgd_err);
}

	function CTOU_SaveTgt(NameTgt)
{
	CGEN_SaveArrays(NameTgd, ctou_tgt, ctou_tgt_sc, ctou_tgt_err);
}

function CTOU_PrintIdSetCal()
{
	var P2, P1, P0;
	
	switch(ctou_ud_test)
	{
		case 600:
			P2 = dev.r(36);
			P1 = dev.r(37);
			P0 = dev.r(38);
			break;
			
		case 1000:
			P2 = dev.r(39);
			P1 = dev.r(40);
			P0 = dev.r(41);
			break;
			
		case 1500:
			P2 = dev.r(42);
			P1 = dev.r(43);
			P0 = dev.r(44);
			break;
	}
	
	print("Id set P2 x1e6 : " + P2);
	print("Id set P1 x1000: " + P1);
	print("Id set P0      : " + P0);
}

function CTOU_PrintIdCal()
{
	print("I P2 x1e6  : " + dev.rs(49));
	print("I P1 x1000 : " + dev.r(48));
	print("I P0 x1000 : " + dev.rs(47));
}

function CTOU_PrintUdCal()
{
	dev.w(180, ctou_TOCUHP_nid);
	
	dev.w(181, 22);
	dev.c(41);
	sleep(10);
	print("Ud P2 x1e6 :	" + dev.rs(182));
	
	dev.w(181, 23);
	dev.c(41);
	sleep(10);
	print("Ud P1 x1000:	" + dev.rs(182));
	
	dev.w(181, 24);
	dev.c(41);
	sleep(10);
	print("Ud P0      : " + dev.rs(182));
}

function CTOU_PrintTgdCal()
{
	switch(ctou_ud)
	{
		case 600:
			print("Tgd P2 x1e6  : " + dev.rs(60));
			print("Tgd P1 x1000 : " + dev.r(61));
			print("Tgd P0       : " + dev.rs(62));
			break;
			
		case 1000:
			print("Tgd P2 x1e6  : " + dev.rs(63));
			print("Tgd P1 x1000 : " + dev.r(64));
			print("Tgd P0       : " + dev.rs(65));
			break;
			
		case 1500:
			print("Tgd P2 x1e6  : " + dev.rs(66));
			print("Tgd P1 x1000 : " + dev.r(67));
			print("Tgd P0       : " + dev.rs(68));
			break;
	}
}

function CTOU_PrintTgtCal()
{
	switch(ctou_ud)
	{
		case 600:
			print("Tgt P2 x1e6  : " + dev.rs(70));
			print("Tgt P1 x1000 : " + dev.r(71));
			print("Tgt P0       : " + dev.rs(72));
			break;
			
		case 1000:
			print("Tgt P2 x1e6  : " + dev.rs(73));
			print("Tgt P1 x1000 : " + dev.r(74));
			print("Tgt P0       : " + dev.rs(75));
			break;
			
		case 1500:
			print("Tgt P2 x1e6  : " + dev.rs(76));
			print("Tgt P1 x1000 : " + dev.r(77));
			print("Tgt P0       : " + dev.rs(78));
			break;
	}
}

function CTOU_ResetIdCal()
{
	CTOU_CalId(0, 1, 0);
	CTOU_CalId_Set(0, 1, 0);
}

function CTOU_ResetUdCal()
{
	CTOU_CalUd(0, 1, 0);
}

function CTOU_ResetTgdCal() 
{
	CTOU_CalTgd(0, 1, 0);
}

function CTOU_ResetTgtCal() 
{
	CTOU_CalTgt(0, 1, 0);
}

function CTOU_CalId_Set(P2, P1, P0)
{
	switch(ctou_ud_test)
	{
		case 600:
			dev.ws(36, Math.round(P2 * 1e6));
			dev.w(37, Math.round(P1 * 1000));
			dev.ws(38, Math.round(P0));
			break;
			
		case 1000:
			dev.ws(39, Math.round(P2 * 1e6));
			dev.w(40, Math.round(P1 * 1000));
			dev.ws(41, Math.round(P0));
			break;
			
		case 1500:
			dev.ws(42, Math.round(P2 * 1e6));
			dev.w(43, Math.round(P1 * 1000));
			dev.ws(44, Math.round(P0));
			break;
	}
}

function CTOU_CalId(P2, P1, P0)
{
	dev.ws(49, Math.round(P2 * 1e6));
	dev.w(48, Math.round(P1 * 1000));
	dev.ws(47, Math.round(P0));
}

function CTOU_CalUd(P2, P1, P0)
{
	dev.w(180, ctou_TOCUHP_nid);
	
	dev.w(181, 22);
	dev.ws(182, Math.round(P2 * 1e6));
	dev.c(42);
	
	sleep(10);
	
	dev.w(181, 23);
	dev.w(182, Math.round(P1 * 1000));
	dev.c(42);
	
	sleep(10);
	
	dev.w(181, 24);
	dev.ws(182, Math.round(P0));
	dev.c(42);
	
	sleep(10);
}

function CTOU_CalTgd(P2, P1, P0)
{
	switch(ctou_ud)
	{
		case 600:
			dev.ws(60, Math.round(P2 * 1e6));
			dev.w(61, Math.round(P1 * 1000));
			dev.ws(62, Math.round(P0));
			break;
			
		case 1000:
			dev.ws(63, Math.round(P2 * 1e6));
			dev.w(64, Math.round(P1 * 1000));
			dev.ws(65, Math.round(P0));
			break;
			
		case 1500:
			dev.ws(66, Math.round(P2 * 1e6));
			dev.w(67, Math.round(P1 * 1000));
			dev.ws(68, Math.round(P0));
			break;
	}
}

function CTOU_CalTgt(P2, P1, P0)
{
	switch(ctou_ud)
	{
		case 600:
			dev.ws(70, Math.round(P2 * 1e6));
			dev.w(71, Math.round(P1 * 1000));
			dev.ws(72, Math.round(P0));
			break;
			
		case 1000:
			dev.ws(73, Math.round(P2 * 1e6));
			dev.w(74, Math.round(P1 * 1000));
			dev.ws(75, Math.round(P0));
			break;
			
		case 1500:
			dev.ws(76, Math.round(P2 * 1e6));
			dev.w(77, Math.round(P1 * 1000));
			dev.ws(78, Math.round(P0));
			break;
	}
}

function CTOU_CalUdApllySettings()
{
	dev.w(180, ctou_TOCUHP_nid);
	dev.w(183, 200);
	dev.c(40);
	
	sleep(10);
}

function CTOMU_CommutationControl(Control)
{
	if(Control)
	{
		dev.w(14, 0);
		dev.w(190, 0);
		dev.c(21);
		dev.c(22);
	}
	else
		dev.w(14, 1);
}
