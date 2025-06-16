include("TestTOU_HP.js");
include("Tektronix.js");
include("CalGeneral.js");
include("TEK_GetData.js");

// Input parameters
ctou_ud_test = 600; 								// Available - 600V, 1000V, 1500V
ctou_id_test_arr = [125, 1000, 2500];				// in A
ctou_ig_test = 2000; 								// in mA
ctou_rise_time_ig = 1; 								// in us
//
ctou_idmin = 125;		// in A
ctou_idmax = 400;		// in A
ctou_id_points = 3;
ctou_udmin = 600;		// in V
ctou_udmax = 1500;		// in V
ctou_ud_points = 8;
ctou_r_0_bit = 480;		// Resistance 0 bit, in Ohm
ctou_k_idstp = 10;
//
ctou_ud_array = [600, 1000, 1500];			// in V
//
ctou_Ri = 0.001;		// Anode current shunt resistance, in Ohm
ctou_Rshunt_gate = 2; 	// Gate current shunt resistance, in Ohm
//
ctou_nid = 11;			// CAN node id
ctou_TOCUHP_nid = 21;	// TOCU HP node id

// Counters
ctou_cntTotal = 0;
ctou_cntDone = 0;

// Iterations
ctou_Iterations = 1;

// Average
ctou_UseAvg = 0;

// Measurement errors
EUosc = 3;
ETosc = 0.5;
EProbe = 2;
Eshunt = 1.1;

// Verify Id by bits
ctou_verify_i_bit = 0;
id_bit_csv_array = [];
ctou_id_bit_sum = [];

// Auto Measure Time
ctou_ig_sc_arr = [];
ctou_ud_sc_arr = [];
ctou_ig_cursor_arr = [];
ctou_ud_cursor_arr = [];

// Сalibrate time flag
ctou_tgd_plot = 1;
ctou_tgt_plot = 1;

// Channels
ctou_chMeasureI = 1;
ctou_chMeasureU = 2;
ctou_chSync = 3;

// Results storage
ctou_id = [];
ctou_id_set = [];
ctou_ud_set = [];
ctou_tgd = [];
ctou_tgt = [];

// Tektronix data
ctou_id_sc = [];
ctou_ud_sc = [];
ctou_tgd_sc = [];
ctou_tgt_sc = [];

// Relative error
ctou_id_err = [];
ctou_id_set_err = [];
ctou_ud_set_err = [];
ctou_tgd_err = [];
ctou_tgt_err = [];

// Summary error
ctou_id_set_err_sum = [];
ctou_ud_set_err_sum = [];
ctou_tgd_err_sum = [];
ctou_tgt_err_sum = [];

// Correction
ctou_id_corr = [];
ctou_id_set_corr = [];
ctou_ud_set_corr = [];
ctou_tgd_corr = [];
ctou_tgt_corr = [];

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

function CTOU_СalibrateIdset()
{	
	// dev.nid(ctou_nid);
 	// CTOMU_CommutationControl(0);
	
	// Collect data
	CTOU_ResetA();
	CTOU_ResetIdsetCal();
	
	// Tektronix init
	CTOU_IdTekInit();

	// Reload values
	var CurrentArray = CGEN_GetRangeLogarithm(ctou_idmin, ctou_idmax, ctou_id_points);

	if (CTOU_IdCollect(CurrentArray, ctou_Iterations))
	{
		CTOU_SaveIdset("touhp_idset");

		// Plot relative error distribution
		scattern(ctou_id_set, ctou_id_set_err, "Current (in A)", "Error (in %)", "Current setpoint relative error, voltage test " + ctou_ud_test + "V");
		scattern(ctou_id_set, ctou_id_set_err_sum, "Id (in A)", "Error (in %)", "Current setpoint summary error, voltage test " + ctou_ud_test + "V");

		// Calculate correction
		ctou_id_set_corr = CGEN_GetCorrection2("touhp_idset");
		CTOU_CalId_Set(ctou_id_set_corr[0], ctou_id_set_corr[1], ctou_id_set_corr[2]);
		CTOU_PrintIdSetCal();
	}

	// CTOMU_CommutationControl(1);
}

function CTOU_СalibrateId()
{
	// Collect data
	CTOU_ResetA();
	CTOU_ResetIdCal();

	// Tektronix init
	CTOU_IdTekInit();

	// Reload values
	var CurrentArray = CGEN_GetRangeLogarithm(ctou_idmin, ctou_idmax, ctou_id_points);

	if (CTOU_IdCollect(CurrentArray, ctou_Iterations))
	{
		CTOU_SaveId("touhp_id");

		// Plot relative error distribution
		scattern(ctou_id_sc, ctou_id_err, "Current (in A)", "Error (in %)", "Current relative error, voltage test " + ctou_ud_test + "V");
		
		// Calculate correction
		ctou_id_corr = CGEN_GetCorrection2("touhp_id");
		CTOU_CalId(ctou_id_corr[0], ctou_id_corr[1], ctou_id_corr[2]);
		CTOU_PrintIdCal();
	}
}

function CTOU_СalibrateTOCUHP_Ud()
{	
	// dev.nid(ctou_nid);
 	// CTOMU_CommutationControl(1);

	// Collect data
	CTOU_ResetA();
	CTOU_ResetUdCalTOCUHP();
	
	// Tektronix init
	CTOU_UdTekInit();

	// var VoltageArray = CGEN_GetRangeLogarithm(ctou_udmin, ctou_udmax, ctou_ud_points);

	if (CTOU_UdCollect(ctou_ud_array, ctou_Iterations))
	{
		CTOU_SaveUd("touhp_ud");

		// Plot relative error distribution
		scattern(ctou_ud_set, ctou_ud_set_err, "Voltage (in V)", "Error (in %)", "Volatge setpoint relative error");

		// Calculate correction
		ctou_ud_set_corr = CGEN_GetCorrection2("touhp_ud");
		CTOU_CalUdTOCUHP(ctou_ud_set_corr[0], ctou_ud_set_corr[1], ctou_ud_set_corr[2]);
		CTOU_PrintUdCalTOCUHP();
	}
}

function CTOU_CalibrateTOMUHP_Ud()
{
	// Collect data
	CTOU_ResetA();
	CTOU_ResetUdCalTOMUHP();

	// Tektronix init
	CTOU_UdTekInit();

	// var VoltageArray = CGEN_GetRangeLogarithm(ctou_udmin, ctou_udmax, ctou_ud_points);

	if (CTOU_UdCollect(ctou_ud_array, ctou_Iterations))
	{
		CTOU_SaveUd("touhp_ud");

		// Plot relative error distribution
		scattern(ctou_ud_set, ctou_ud_set_err, "Voltage (in V)", "Error (in %)", "Volatge setpoint relative error");

		// Calculate correction
		ctou_ud_set_corr = CGEN_GetCorrection2("touhp_ud");
		CTOU_CalUdTOMUHP(ctou_ud_set_corr[0], ctou_ud_set_corr[1], ctou_ud_set_corr[2]);
		CTOU_PrintUdCalTOMUHP();
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
		scattern(ctou_tgd_sc, ctou_tgd_err, "Tgd (in ns)", "Error (in %)", "Tgd relative error, voltage test " + ctou_ud_test + "V");

		// Plot summary error distribution
		scattern(ctou_tgd_sc, ctou_tgd_err_sum, "Tgd (in ns)", "Error (in %)", "Tgd summary error, voltage test " + ctou_ud_test + "V");
		
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
		scattern(ctou_tgt_sc, ctou_tgt_err, "Tgt (in ns)", "Error (in %)", "Calibrate Tgt relative error, voltage test " + ctou_ud_test + "V");

		// Plot summary error distribution
		scattern(ctou_tgt_sc, ctou_tgt_err_sum, "Tgt (in ns)", "Error (in %)", "Calibrate Tgt_Sum_Err summary error, voltage test " + ctou_ud_test + "V");
		
		// Calculate correction
		ctou_tgt_corr = CGEN_GetCorrection2("tou_tgt_fixed");
		CTOU_CalTgt(ctou_tgt_corr[0], ctou_tgt_corr[1], ctou_tgt_corr[2]);
		CTOU_PrintTgtCal();
	}
}

function CTOU_VerifyId()
{	
	// dev.nid(ctou_nid);
 	// CTOMU_CommutationControl(0);

	// Collect data
	CTOU_ResetA();
	
	// Tektronix init
	CTOU_IdTekInit();

	// Collect data
	if(ctou_verify_i_bit)
	{
		var ctou_idstp_min = (ctou_ud_test / ctou_r_0_bit);
		var ctou_idstp = ctou_idstp_min * ctou_k_idstp;
		var CurrentArray = CGEN_GetRange(ctou_idmin, ctou_idmax, ctou_idstp);	
	}
	else
		var CurrentArray = CGEN_GetRangeLogarithm(ctou_idmin, ctou_idmax, ctou_id_points);

	if (CTOU_IdCollect(CurrentArray, ctou_Iterations))
	{
		CTOU_SaveId("tou_i_fixed");
		CTOU_SaveIdset("tou_iset_fixed");

		// Plot relative error distribution
		scattern(ctou_id_sc, ctou_id_err, "Id (in A)", "Error (in %)", "Current relative error, voltage test " + ctou_ud_test + "V");
		scattern(ctou_id_set, ctou_id_set_err, "Id (in A)", "Error (in %)", "Current setpoint relative error, voltage test " + ctou_ud_test + "V");
		
		// Plot summary error distribution
		scattern(ctou_id_set, ctou_id_set_err_sum, "Id (in A)", "Error (in %)", "Current setpoint summary error, voltage test " + ctou_ud_test + "V");

		if(ctou_verify_i_bit)	
		scattern(ctou_id_bit_sum, ctou_id_sc, "Bit", "Id (in A)", "Id / Bit");
	}

	// CTOMU_CommutationControl(1);
}

function CTOU_VerifyUd()
{	
	// dev.nid(ctou_nid);
 	// CTOMU_CommutationControl(1);

	// Collect data
	CTOU_ResetA();
	
	// Tektronix init
	CTOU_UdTekInit();

	if (CTOU_UdCollect(ctou_ud_array, ctou_Iterations))
	{
		CTOU_SaveUd("tou_ud_fixed");

		// Plot relative error distribution
		scattern(ctou_ud_set, ctou_ud_set_err, "Voltage (in V)", "Error (in %)", "Voltage setpoint relative error");
	
		// Plot summary error distribution
		scattern(ctou_ud_set, ctou_ud_set_err_sum, "Voltage (in V)", "Error (in %)", "Voltage setpoint summary error");
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

		if (ctou_tgd_plot)
		{
			// Plot relative and summary error distribution
			scattern(ctou_tgd_sc, ctou_tgd_err, "Tgd (in ns)", "Error (in %)", "Tgd relative error, voltage test " + ctou_ud_test + "V");
			scattern(ctou_tgd_sc, ctou_tgd_err_sum, "Tgd (in ns)", "Error (in %)", "Tgd summary error, voltage test " + ctou_ud_test + "V");
		}

		if (ctou_tgt_plot)
		{
			// Plot relative and summary error distribution
			scattern(ctou_tgt_sc, ctou_tgt_err, "Tgt (in ns)", "Error (in %)", "Tgt relative error, voltage test " + ctou_ud_test + "V");
			scattern(ctou_tgt_sc, ctou_tgt_err_sum, "Tgt (in ns)", "Error (in %)", "Tgt summary error, voltage test " + ctou_ud_test + "V");
		}
	}
}

function CTOU_IdTekInit()
{
	// Init channels
	TEK_ChannelInit(ctou_chMeasureI, "1", "0.01");
	// Init trigger
	TEK_TriggerInit(ctou_chMeasureI, "0.05");
	// Horizontal settings
	TEK_Horizontal("5e-6", "10e-6");
	
		// Display channels
	for (var i = 1; i <= 4; i++)
	{
		if (i == ctou_chMeasureI)
			TEK_ChannelOn(i);
		else
			TEK_ChannelOff(i);
	}

	// Init measurement
	TEK_MeasMaxInit(ctou_chMeasureI, 1);
	TEK_MeasRiseTimeInit(ctou_chMeasureI, 2);
	TEK_Busy();
}

function CTOU_UdTekInit()
{
	// Init channels
	TEK_ChannelInit(ctou_chMeasureU, "100", "100");
	// Init trigger
	TEK_TriggerInit(ctou_chMeasureU, "300");
	// Horizontal settings
	TEK_Horizontal("25e-6", "75e-6");
	
		// Display channels
	for (var i = 1; i <= 4; i++)
	{
		if (i == ctou_chMeasureU)
			TEK_ChannelOn(i);
		else
			TEK_ChannelOff(i);
	}
	
	// Init measurement
	TEK_MeasMaxInit(ctou_chMeasureU, 1);
	TEK_Busy();
}

function CTOU_TimeTekInit()
{
	// Init channels
	TEK_ChannelInit(ctou_chMeasureI, "1", "0.8"); // для тока управления 2 А на шунте 2 Ом
	TEK_ChannelInit(ctou_chMeasureU, "100", "85");
	TEK_ChannelInit(ctou_chSync, "1", "1");
	// Init trigger
	TEK_TriggerInit(ctou_chSync, "2");
	// Horizontal settings
	TEK_Horizontal("5e-6", "20e-6");

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
	TEK_Busy();
}

function CTOU_MeasureTimeSc(VoltageIg, VoltageUd)
{
	ctou_ig_sc_arr = [];
	ctou_ud_sc_arr = [];
	ctou_ig_cursor_arr = [];
	ctou_ud_cursor_arr = [];

	var ig_10_index = 0;
	var ud_10_index = 0;
	var ud_90_index = 0;
	var Tgd = 0;
	var Tgt = 0;

	// Вычисление уровней 10 % тока управления и 10 % и 90 % анодного напряжения 
	var ctou_ig_10 = VoltageIg * 0.1;
	var ctou_ud_10 = VoltageUd * 0.1;
	var ctou_ud_90 = VoltageUd * 0.9;

	// Считывание массивов с осциллографа
	ctou_ig_sc_arr = TEK_GetChannelData(ctou_chMeasureI);
	ctou_ud_sc_arr = TEK_GetChannelData(ctou_chMeasureU);

	// Извлечение 250 точек
	for(var i = 5; i < ctou_ig_sc_arr.length; i += 10)
	{
		ctou_ig_cursor_arr.push(ctou_ig_sc_arr[i]);
	}

	for(var j = 5; j < ctou_ud_sc_arr.length; j += 10)
	{
		ctou_ud_cursor_arr.push(ctou_ud_sc_arr[j]);
	}

	// Определение индекса элемента массива с наименьшей ошибкой
	var ig_10_min_err = Math.abs(ctou_ig_10 - ctou_ig_cursor_arr[0]);
	for(var k = 1; k < ctou_ig_cursor_arr.length; k++)
	{
		var ig_10_err = Math.abs(ctou_ig_10 - ctou_ig_cursor_arr[k]);
		if(ig_10_err < ig_10_min_err)
		{
			ig_10_min_err = ig_10_err;
			ig_10_index = k;
		}
	}

	var ud_10_min_err = Math.abs(ctou_ud_10 - ctou_ud_cursor_arr[0]);
	for(var m = 1; m < ctou_ud_cursor_arr.length; m++)
	{
		var ud_10_err = Math.abs(ctou_ud_10 - ctou_ud_cursor_arr[m]);
		if(ud_10_err < ud_10_min_err)
		{
			ud_10_min_err = ud_10_err;
			ud_10_index = m;
		}
	}

	var ud_90_min_err = Math.abs(ctou_ud_90 - ctou_ud_cursor_arr[0]);
	for(var n = 1; n < ctou_ud_cursor_arr.length; n++)
	{
		var ud_90_err = Math.abs(ctou_ud_90 - ctou_ud_cursor_arr[n]);
		if(ud_90_err < ud_90_min_err)
		{
			ud_90_min_err = ud_90_err;
			ud_90_index = n;
		}
	}

	// Расстояние по горизонтали между двумя ближайшими точками
	var time_scale = TEK_GetTimeScale();
	var time_point_min = (time_scale * 10) / 250;

	// Позиция первой точки
	var time_pos = TEK_GetTimePosition();
	var pos_first_point = - time_scale * 10 / 2 + time_pos;

	// Установка курсора на уровень 10 % тока управления
	var ig_10_time_cursor = pos_first_point + (ig_10_index) * time_point_min;
	TEK_CursorTimeInit(ctou_chMeasureI);
	TEK_CursorTimeРosition(ctou_chMeasureI, ig_10_time_cursor);
	sleep(1000);

	// Установка курсора на уровень 90 % анодного напряжения и измерение Tgd
	var ud_90_time_cursor = pos_first_point + (ud_90_index) * time_point_min;
	TEK_Cursor2TimeРosition(ctou_chMeasureU, ud_90_time_cursor);
	sleep(2000);
	Tgd = TEK_MeasureCursorDelta();

	// Установка курсора на уровень 10 % анодного напряжения и измерение Tgt
	var ud_10_time_cursor = pos_first_point + (ud_10_index) * time_point_min;
	TEK_Cursor2TimeРosition(ctou_chMeasureU, ud_10_time_cursor);
	sleep(2000);
	Tgt = TEK_MeasureCursorDelta();

	return [Tgd, Tgt];
}

function CTOU_IdCollect(CurrentValues, IterationsCount)
{
	ctou_cntTotal = IterationsCount * CurrentValues.length;
	ctou_cntDone = 1;

	if (ctou_verify_i_bit)
		id_bit_csv_array.push("Id set, A; Id meas, A; Id tek, A; di/dt 10/90; Bit NID180; Bit NID181; Bit NID182 & NID183; Bit summary");
	
	// Отключение проверки на КЗ
	dev.w(132,1);

	for (var i = 0; i < IterationsCount; i++)
	{
		for (var j = 0; j < CurrentValues.length; j++)
		{
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
			
			print("-- result " + ctou_cntDone++ + " of " + ctou_cntTotal + " --");
			
			TEK_ScaleVertical(ctou_chMeasureI, CurrentValues[j] * ctou_Ri, 80);
			TEK_TriggerInit(ctou_chMeasureI, (CurrentValues[j] * ctou_Ri) / 2);
			sleep(1000);

			var tou_print_copy = tou_print;
			tou_print = 0;
			for (var k = 0; k < AvgNum; k++)
			{
				TOUHP_Measure(ctou_ud_test, CurrentValues[j].toFixed(1) * 10, ctou_ig_test, ctou_ig_test / ctou_rise_time_ig);
				sleep(1000);
				if(anykey())
				break;
			}
			tou_print = tou_print_copy;
			
			// Set data
			var id_set = CurrentValues[j];
			ctou_id_set.push(id_set);
			print("Id_Set, A: " + id_set);
			print("Ud, В: " + ctou_ud_test);
			
			// Unit data
			var id_meas = dev.r(250);
			ctou_id.push(id_meas);
			print("Id_Meas, A: " + id_meas);

			// Scope data
			var id_sc = (TEK_Measure(1) / ctou_Ri).toFixed(1);
			ctou_id_sc.push(id_sc);
			print("Id_Tek, A: " + id_sc);

			// Relative error
			var id_set_err = ((id_sc - id_set) / id_set * 100).toFixed(2);
			var id_err = ((id_meas - id_sc) / id_sc * 100).toFixed(2);
			ctou_id_set_err.push(id_set_err);
			ctou_id_err.push(id_err);
			print("Id_Set_Err, %: " + id_set_err);
			print("Id_Err, %: " + id_err);
			
			// Summary error
			var E0_id_set = 1.1 * Math.sqrt(Math.pow(EUosc, 2) + Math.pow(Eshunt, 2));
			var id_set_err_sum = (Math.sign_ma(id_set_err) * (Math.abs(id_set_err) + E0_id_set)).toFixed(2);
			ctou_id_set_err_sum.push(id_set_err_sum);
			print("Id_Sum_Err, %: " + id_set_err_sum);
			print("--------------------");

			if (ctou_verify_i_bit)
			{
				// Scope data
				TOUHP_MeasureRiseTimeId(10, 63, ctou_chMeasureI, ctou_Ri);

				var bit_tocu_hp_180 = CTOU_ReadRegisterNID(180, 129);
				var bit_tocu_hp_181 = CTOU_ReadRegisterNID(181, 129);
				var bit_tocu_hp_182 = CTOU_ReadRegisterNID(182, 129);
				dev.nid(11);

				var bit_sum = bit_tocu_hp_180 + bit_tocu_hp_181 + bit_tocu_hp_182;
				ctou_id_bit_sum.push(bit_sum);

				id_bit_csv_array.push(id_set + ";" + id_meas + ";" + id_sc + ";" + didt_sc + ";" + bit_tocu_hp_180 + ";" + bit_tocu_hp_181 + ";" + bit_tocu_hp_182 +  ";" + bit_sum);
				save("data/TOU_Id_bit_" + ctou_ud_test + "V.csv", id_bit_csv_array);
			}

			if (anykey()) return 0;
		}
	}

	dev.w(132,0);
	return 1;
}

function CTOU_UdCollect(VoltageValues, IterationsCount)
{
	ctou_cntTotal = IterationsCount * VoltageValues.length * ctou_id_test_arr.length;
	ctou_cntDone = 1;
	
	for (var i = 0; i < IterationsCount; i++)
	{
		for (var j = 0; j < VoltageValues.length; j++)
		{
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

			TEK_ScaleVertical(ctou_chMeasureU, VoltageValues[j], 80);
			TEK_TriggerInit(ctou_chMeasureU, VoltageValues[j] / 2);
			sleep(1500);

			for (var m = 0; m < ctou_id_test_arr.length; m++)
			{
				print("-- result " + ctou_cntDone++ + " of " + ctou_cntTotal + " --");

				var tou_print_copy = tou_print;
				tou_print = 0;
				for (var k = 0; k < AvgNum; k++)
				{
					TOUHP_Measure(VoltageValues[j], ctou_id_test_arr[m] * 10, ctou_ig_test, ctou_ig_test / ctou_rise_time_ig);
					sleep(3000);
					if (anykey()) return 0;
				}
				tou_print = tou_print_copy;

				// Set data
				var ud_set = VoltageValues[j];
				ctou_ud_set.push(ud_set);
				print("Ud, В: " + ud_set);
				print("Id, A: " + ctou_id_test_arr[m]);

				// Scope data
				var ud_sc = Math.round(TEK_Measure(1));
				ctou_ud_sc.push(ud_sc);
				print("Udtek, В: " + ud_sc);

				// Relative error
				var ud_set_err = ((ud_sc - ud_set) / ud_set * 100).toFixed(2);
				ctou_ud_set_err.push(ud_set_err);
				print("Ud_Set_Err, %:" + ud_set_err);

				// Summary error
				var E0_ud_set = 1.1 * Math.sqrt(Math.pow(EUosc, 2) + Math.pow(EProbe, 2));
				var ud_set_err_sum = (Math.sign_ma(ud_set_err) * (Math.abs(ud_set_err) + E0_ud_set)).toFixed(2);
				ctou_ud_set_err_sum.push(ud_set_err_sum);
				print("Ud_Sum_Err, %: " + ud_set_err_sum);
				print("--------------------");
				
				if (anykey()) return 0;
			}	
			
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

	// Отключение проверки на КЗ
	dev.w(132,1);

	for (var i = 0; i < IterationsCount; i++)
	{
		if(i == 0)
		{
			// Настройка развертки по горизонтали
			TEK_TriggerPulseExtendedInit(ctou_chSync, "2", "dc", "2.5e-6", "positive", "outside");
			CTOU_TekHorizontal(ctou_ud_test, CurrentValues[0]);
			sleep(1000);
		}

		for (var j = 0; j < CurrentValues.length; j++)
		{
			print("-- result " + ctou_cntDone++ + " of " + ctou_cntTotal + " --");
		
			// Настройка развертки по вертикали
			TEK_ScaleVertical(ctou_chMeasureI, ctou_ig_test * ctou_Rshunt_gate / 1000, 80);
			TEK_ScaleVertical(ctou_chMeasureU, ctou_ud_test, 80);
			TEK_MeasMaxInit(ctou_chMeasureI, 2);
			sleep(1000);

			var tou_print_copy = tou_print;
			tou_print = 0;
			for (var k = 0; k < AvgNum; k++)
			{
				TOUHP_Measure(ctou_ud_test, CurrentValues[j] * 10, ctou_ig_test, ctou_ig_test / ctou_rise_time_ig);
				sleep(1000);
				if(anykey())
				break;
			}
			tou_print = tou_print_copy;

			// Измерение времени по курсорам
			var time_result = CTOU_MeasureTimeSc((ctou_ig_test * ctou_Rshunt_gate / 1000), ctou_ud_test);

			// Вывод параметров измерения
			print("Vd, V  : " + ctou_ud_test);
			print("Id, A  : " + CurrentValues[j]);
			print("Ig, mA : " + ctou_ig_test);
			print("--------");

			// Scope data Tgd
			var tgd_sc = Math.round(time_result[0] * 1e9);
			ctou_tgd_sc.push(tgd_sc);
			print("Tgd_Tek, ns: " + tgd_sc);

			// Unit data
			var tgd = dev.r(251);
			ctou_tgd.push(tgd);
			print("Tgd_MME, ns: " + tgd);

			// Relative error
			var tgd_err = ((tgd - tgd_sc) / tgd_sc * 100).toFixed(2);
			ctou_tgd_err.push(tgd_err);
			print("Tgd_Err, %: " + tgd_err);

			// Summary error
			var E0_tgd_tgt = 1.1 * Math.sqrt(Math.pow(EUosc, 2) + Math.pow(ETosc, 2) + Math.pow(EProbe, 2));
			var tgd_err_sum = (Math.sign_ma(tgd_err) * (Math.abs(tgd_err) + E0_tgd_tgt)).toFixed(2);
			ctou_tgd_err_sum.push(tgd_err_sum);
			print("Tgd_Sum_Err, %: " + tgd_err_sum);
			print("--------");

			// Scope data Tgt
			var tgt_sc = Math.round(time_result[1] * 1e9);
			ctou_tgt_sc.push(tgt_sc);
			print("Tgt_Tek, ns: " + tgt_sc);

			// Unit data
			var tgt = dev.r(252);
			ctou_tgt.push(tgt);
			print("Tgt_MME, ns: " + tgt);

			// Relative error
			var tgt_err = ((tgt - tgt_sc) / tgt_sc * 100).toFixed(2);
			ctou_tgt_err.push(tgt_err);
			print("Tgt_Err, %: " + tgt_err);

			// Summary error
			var E0_tgd_tgt = 1.1 * Math.sqrt(Math.pow(EUosc, 2) + Math.pow(ETosc, 2) + Math.pow(EProbe, 2));
			var tgt_err_sum = (Math.sign_ma(tgt_err) * (Math.abs(tgt_err) + E0_tgd_tgt)).toFixed(2);
			ctou_tgt_err_sum.push(tgt_err_sum);
			print("Tgt_Sum_Err, %: " + tgt_err_sum);
			print("--------------------");
			
			if (anykey()) return 0;
		}
	}
	
	dev.w(132,0);

	return 1;
}

function CTOU_TekHorizontal(VoltageValues, CurrentValues)
{
	var tou_print_copy = tou_print;
	tou_print = 0;
	TEK_ScaleVertical(ctou_chMeasureU, VoltageValues, 80);
	TOUHP_Measure(VoltageValues, CurrentValues * 10, 2000, 2000);
	sleep(500);
	tou_print = tou_print_copy;
	
	// Расчет и установка шкалы
	var ctou_fall_time_ud = TEK_Measure(1);
	if (ctou_fall_time_ud < 900e-9)
		TEK_Horizontal(500e-9, -500e-9);
	
	else if (ctou_fall_time_ud > 1.7e-6)
		TEK_Horizontal(2.5e-6, 7.5e-6);

	else
		TEK_Horizontal(1e-6, 1.5e-6);

	if (anykey()) return 0;
}

function CTOU_ResetA()
{
	// Results storage
	ctou_id = [];
	ctou_id_set = [];
	ctou_ud_set = [];
	ctou_tgd = [];
	ctou_tgt = [];

	// Tektronix data
	ctou_id_sc = [];
	ctou_ud_sc = [];
	ctou_tgd_sc = [];
	ctou_tgt_sc = [];

	// Relative error
	ctou_id_err = [];
	ctou_id_set_err = [];
	ctou_ud_set_err = [];
	ctou_tgd_err = [];
	ctou_tgt_err = [];

	// Correction
	ctou_id_corr = [];
	ctou_id_set_corr = [];
	ctou_ud_set_corr = [];
	ctou_tgd_corr = [];
	ctou_tgt_corr = [];

	// Summary error
	ctou_tgd_err_sum = [];
	ctou_tgt_err_sum = [];
	ctou_id_set_err_sum = [];
	ctou_ud_set_err_sum = [];

	id_bit_csv_array = [];
	ctou_id_bit_sum = [];
}

function CTOU_SaveId(NameId)
{
	CGEN_SaveArrays(NameId, ctou_id, ctou_id_sc, ctou_id_err);
}

function CTOU_SaveIdset(NameIdset)
{
	CGEN_SaveArrays(NameIdset, ctou_id_sc, ctou_id_set, ctou_id_set_err);
}

function CTOU_SaveUd(NameUd)
{
	CGEN_SaveArrays(NameUd, ctou_ud_sc, ctou_ud_set, ctou_ud_set_err);
}

function CTOU_SaveTgd(NameTgd)
{
	CGEN_SaveArrays(NameTgd, ctou_tgd, ctou_tgd_sc, ctou_tgd_err);
}

	function CTOU_SaveTgt(NameTgt)
{
	CGEN_SaveArrays(NameTgt, ctou_tgt, ctou_tgt_sc, ctou_tgt_err);
}

function CTOU_PrintIdSetCal()
{
	var P2, P1, P0;
	
	switch(ctou_ud_test)
	{
		case 600:
			P2 = dev.rs(36);
			P1 = dev.r(37);
			P0 = dev.rs(38);
			break;
			
		case 1000:
			P2 = dev.rs(39);
			P1 = dev.r(40);
			P0 = dev.rs(41);
			break;
			
		case 1500:
			P2 = dev.rs(42);
			P1 = dev.r(43);
			P0 = dev.rs(44);
			break;
	}
	
	print("Id set P2 x1e6 : " + P2);
	print("Id set P1 x1000: " + P1);
	print("Id set P0      : " + P0);
}

function CTOU_PrintIdCal()
{
	print("Id P2 x1e6  : " + dev.rs(49));
	print("Id P1 x1000 : " + dev.r(48));
	print("Id P0 	  : " + dev.rs(47));
}

function CTOU_PrintUdCalTOCUHP()
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

function CTOU_PrintUdCalTOMUHP()
{
	print("Ud P2 x1e6  : " + dev.rs(86));
	print("Ud P1 x1000 : " + dev.r(87));
	print("Ud P0 	  : " + dev.rs(88));
}

function CTOU_PrintTgdCal()
{
	switch(ctou_ud_test)
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
	switch(ctou_ud_test)
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

function CTOU_ResetIdsetCal()
{
	CTOU_CalId_Set(0, 1, 0);
}

function CTOU_ResetIdCal()
{
	CTOU_CalId(0, 1, 0);
}

function CTOU_ResetUdCalTOCUHP()
{
	CTOU_CalUdTOCUHP(0, 1, 0);
}

function CTOU_ResetUdCalTOMUHP()
{
	CTOU_CalUdTOMUHP(0, 1, 0)
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

function CTOU_CalUdTOCUHP(P2, P1, P0)
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

function CTOU_CalUdTOMUHP(P2, P1, P0)
{
	dev.ws(86, Math.round(P2 * 1e6));
	dev.w(87, Math.round(P1 * 1000));
	dev.ws(88, Math.round(P0));	
}

function CTOU_CalTgd(P2, P1, P0)
{
	switch(ctou_ud_test)
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
	switch(ctou_ud_test)
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

function CTOU_ReadRegisterNID(NID, Register)
{
	dev.nid(NID);
	return dev.r(Register);
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