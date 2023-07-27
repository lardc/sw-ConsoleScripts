include("TestTOU.js")
include("Tektronix.js")
include("CalGeneral.js")

// Input params
ctou_Imax = 1250;	// MAX DUT Current [A]
ctou_Ri = 1e-3;		// Current shunt resistance

// Calibrate I
ctou_Imin = 160;
ctou_Imax = ctou_Imax;
ctou_Istp = 60;

// Counters
ctou_cntTotal = 0;
ctou_cntDone = 0;

// Iterations
ctou_Iterations = 1;

// Channels
ctou_chMeasureV = 1;
ctou_chMeasureI = 2;
ctou_chSync = 3;

// Results storage
ctou_i = [];
ctou_i_set = [];

// Tektronix data
ctou_i_sc = [];

// Relative error
ctou_i_err = [];
ctou_iset_err = [];

// Correction
ctou_i_corr = [];

// Timings
ctou_tgt = [];
ctou_tgd = [];
ctou_tgt_sc = [];
ctou_tgt_err = [];
ctou_tgd_sc = [];
ctou_tgd_err = [];

tgd_read = 0;
tgt_read = 0;

ctou_measure_time = 0;
ctou_measure_time_hand = 0;
ctou_measure_tgd = 1; // измерять параметр tgd? 1 = да, 0 = нет
ctou_measure_tgt = 0; // измерять параметр tgt? 1 = да, 0 = нет
ctou_scale_osc = 1; // 0.5 мкс, 1 мкс, 2.5 мкс 

ctou_UseAvg = 0;

function CTOU_Init(portTOU, portTek, channelMeasureV, channelMeasureI, channelSync)
{
	if (channelMeasureI < 1 || channelMeasureI > 4)
	{
		print("Wrong channel numbers");
		return;
	}

	// Copy channel information
	ctou_chMeasureV = channelMeasureV;
	ctou_chMeasureI = channelMeasureI;
	ctou_chSync = channelSync;

	// Init TOU
	dev.Disconnect();
	dev.Connect(portTOU);

	// Init Tektronix
	TEK_PortInit(portTek);

	// Tektronix init
	// Init channels
	TEK_ChannelInit(ctou_chMeasureV, "100", "50");
	TEK_ChannelInit(ctou_chMeasureI, "1", "0.1");
	TEK_ChannelInit(ctou_chSync, "1", "1");
	// Init trigger
	TEK_TriggerInit(ctou_chSync, "3");
	// Horizontal settings
	TEK_Horizontal(ctou_scale_osc * 1e-6, "0e-6");

	TEK_Send("acquire:stopafter sequence");

	// Display channels
	for (var i = 1; i <= 4; i++)
	{
		if (i == ctou_chMeasureI || i == ctou_chSync || i == ctou_chMeasureV)
			TEK_ChannelOn(i);
		else
			TEK_ChannelOff(i);
	}

	
	// Init measurement
	CTOU_Measure(ctou_chMeasureI, "4");
}

function CTOU_CalibrateI()
{
	if(dev.r(192) == 0) dev.c(1);
	// Collect data
	CTOU_ResetA();
	CTOU_ResetCal();

	// Reload values
	var CurrentArray = CGEN_GetRange(ctou_Imin, ctou_Imax, ctou_Istp);
	ctou_measure_time = 0;

	if (CTOU_Collect(CurrentArray, ctou_Iterations))
	{
		CTOU_SaveI("tou_i");
		CTOU_SaveIset("tou_iset");

		// Plot relative error distribution
		scattern(ctou_i_sc, ctou_i_err, "Current (in A)", "Error (in %)", "Current relative error");
		sleep(200);
		scattern(ctou_i_set, ctou_iset_err, "Current (in A)", "Error (in %)", "Current setpoint relative error");

		// Calculate correction
		ctou_i_corr = CGEN_GetCorrection2("tou_i");
		CTOU_CalI(ctou_i_corr[0], ctou_i_corr[1], ctou_i_corr[2]);
		CTOU_PrintICal();
	}
}

function CTOU_VerifyI()
{	
	if(dev.r(192) == 0) dev.c(1);
	// Collect data
	CTOU_ResetA();

	// Collect data
	var CurrentArray = CGEN_GetRange(ctou_Imin, ctou_Imax, ctou_Istp);
	ctou_measure_time = 0;

	if (CTOU_Collect(CurrentArray, ctou_Iterations))
	{
		CTOU_SaveI("tou_i_fixed");
		CTOU_SaveIset("tou_iset_fixed");

		// Plot relative error distribution
		scattern(ctou_i_sc, ctou_i_err, "Current (in A)", "Error (in %)", "Current relative error");
		sleep(200);
		scattern(ctou_i_set, ctou_iset_err, "Current (in A)", "Error (in %)", "Current setpoint relative error");
	}
}

function CTOU_VerifyTime()
{
	var start = new Date();

	// Collect data
	CTOU_ResetA();

	// Collect data
	var CurrentArray = CGEN_GetRange(ctou_Imin, ctou_Imax, ctou_Istp);
	ctou_measure_time = 1;

	if (CTOU_Collect(CurrentArray, ctou_Iterations))
	{
		CTOU_SaveTgd("tou_tgd_fixed");
		CTOU_SaveTgt("tou_tgt_fixed");

		// Plot relative error distribution
		scattern(ctou_tgt_sc, ctou_tgt_err, "Time (in us)", "Error (in %)", "tgt relative error");
		sleep(200);
		scattern(ctou_tgd_sc, ctou_tgd_err, "Time (in us)", "Error (in %)", "tgd relative error");
	}

	var left_time = new Date(((new Date()).getTime()) - (start.getTime()));
	p("Заняло " + left_time.getMinutes() + " мин и " +left_time.getSeconds() + " сек");
}

function CTOU_TekCursor(Channel)
{
	TEK_Send("cursor:select:source ch" + Channel);
	TEK_Send("cursor:function vbars");
	TEK_Send("cursor:vbars:position1 40e-6");
	TEK_Send("cursor:vbars:position2 40e-6");
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

function CTOU_Collect(CurrentValues, IterationsCount)
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
		cursor_place_prev10 = -4.5 * ctou_scale_osc * 1e-6; // для первого значения курсора
		
		for (var j = 0; j < CurrentValues.length; j++)
		{
			print("-- result " + ctou_cntDone++ + " of " + ctou_cntTotal + " --");
			print("Iset, A: " + CurrentValues[j]);
			
			if(ctou_measure_time)
			{
				TEK_Send("cursor:select:source ch" + ctou_chMeasureV);
				//CTOU_TekScale(ctou_chMeasureV, 225);				
				TEK_TriggerPulseExtendedInit(ctou_chSync, "4", "dc", 4.5 * ctou_scale_osc * 1e-6 , "positive", "outside");
				tgd_read = 0;
				tgt_read = 0;
			}
			else
			{
				CTOU_TekScale(ctou_chMeasureI, (CurrentValues[j] * ctou_Ri));
				TEK_TriggerInit(ctou_chMeasureI, (CurrentValues[j] * ctou_Ri) / 1.5);
				CTOU_TekCursor(ctou_chMeasureI);				
			}


			sleep(1500);

			ctou_i_set.push(CurrentValues[j]);

			var tou_print_copy = tou_print;
			var tou_printError_copy	= tou_printError;
			//
			tou_print = 0;
			tou_printError = 0;

			for (var k = 0; k < AvgNum; k++)
			{
				if(ctou_measure_time)
				{
					TEK_Send("acquire:state run");
					TOU_Measure(CurrentValues[j]);
					tgd_read += dev.r(251);
					tgt_read += dev.r(252);
				}					
				else
				{
					TOU_Current(CurrentValues[j]);
					sleep(2000);
				}
			}
			tou_print = tou_print_copy;
			tou_printError = tou_printError_copy;
			
			// Unit data
			var i_read = dev.r(250);
			ctou_i.push(i_read);
			print("Itou, A: " + i_read);
			sleep(1000);

			// Scope data
			if(ctou_measure_time)
			{
				tgd_read = tgd_read / AvgNum;
				tgt_read = tgt_read / AvgNum;

				print("Tgd	[us]: " + (tgd_read / 1000));
				print("Ton	[us]: " + (tgt_read / 1000));
				print("------------------");

				
				//TEK_Send("cursor:vbars:position2 " + ctou_scale_osc * -4.99 * 1e-6);

				//ctou_tgd_u90 = Math.round(TEK_Exec("cursor:vbars:hpos2?") * 0.9);
				//ctou_tgd_u90.toFixed(0);

				//ctou_tgt_u10 = Math.round(TEK_Exec("cursor:vbars:hpos2?") * 0.1);
				//ctou_tgt_u10.toFixed(0);

				
				//p(ctou_tgd_u90);
				//p(ctou_tgt_u10);
				ctou_tgd_u90 = 270;
				ctou_tgt_u10 = 30;

				var cursor_place = -4.5 * ctou_scale_osc * 1e-6;
				TEK_Send("cursor:vbars:position1 "+ cursor_place);
				TEK_Send("cursor:vbars:position2 "+ cursor_place);

				if(ctou_measure_time_hand)
				{
					print("Enter tgt (in us):");
					var tgt_sc = readline();	

					print("Enter tgd (in us):");
					var tgd_sc = readline();
				}
				else
				{
					// Измерение tgd					
					// Объявление и обнуление переменных
					var ctou_tgd_u_err = 0;
					var ctou_tgd_u_preverr = 0;

					var ctou_tgd_integral = 0;
					var ctou_tgd_derivative = 0;

					var ctou_tgd_kp = 5e-9;
					var ctou_tgd_ki = 6e-9;
					var ctou_tgd_kd = 0e-9;

					// Первое измерение для расчета буудщей уставки
					ctou_tgd_u = parseFloat(TEK_Exec("cursor:vbars:hpos2?"));
					ctou_tgd_u.toFixed(1);

					if(ctou_measure_tgd)
						while(ctou_tgd_u > ctou_tgd_u90)
						{
							// ПИД регулятор
							ctou_tgd_u_err = ctou_tgd_u - ctou_tgd_u90;

							ctou_tgd_integral = ctou_tgd_integral + ctou_tgd_u_err * ctou_tgd_ki;

							ctou_tgd_derivative = ctou_tgd_u_err - ctou_tgd_u_preverr;

							ctou_tgd_u_preverr = ctou_tgd_u_err;

							cursor_place_fixed = ctou_tgd_u_err * ctou_tgd_kp + ctou_tgd_integral * ctou_tgd_ki + ctou_tgd_derivative * ctou_tgd_kd;
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

					var tgd_sc = TEK_Exec("cursor:vbars:delta?") * 1e6;
					print("tgd osc = " + tgd_sc.toFixed(2));
					//.....................................

					// ИЗМЕРЕНИЕ tgt
					// Объявление и обнуление переменных
					ctou_tgt_u_err = 0;
					ctou_tgt_u_preverr = 0;

					ctou_tgt_integral = 0;
					ctou_tgt_derivative = 0;

					ctou_tgt_kp = 8e-9;
					ctou_tgt_ki = 5e-9;
					ctou_tgt_kd = 0e-9;

					// Установка уставки для курсора которая была последней на прошлом шаге
					// Но немного по времени левее, для ускорения измерения
					cursor_place = cursor_place_prev10;
					TEK_Send("cursor:vbars:position2 " + cursor_place);
					ctou_tgt_u = parseFloat(TEK_Exec("cursor:vbars:hpos2?"));
					ctou_tgt_u.toFixed(1);
					
					if(ctou_measure_tgt)
						while(ctou_tgt_u > ctou_tgt_u10)
						{
							// ПИД регулятор
							ctou_tgt_u_err = ctou_tgt_u - ctou_tgt_u10;
							
							ctou_tgt_integral = ctou_tgt_integral + ctou_tgt_u_err * ctou_tgt_ki;
							
							ctou_tgt_derivative = ctou_tgt_u_err - ctou_tgt_u_preverr;
							
							ctou_tgt_u_preverr = ctou_tgt_u_err;
							
							cursor_place_fixed = ctou_tgt_u_err * ctou_tgt_kp + ctou_tgt_integral * ctou_tgt_ki + ctou_tgt_derivative * ctou_tgt_kd;
							//-----------------

							//Если cursor_place_fixed будет выдавать значения менее 10нс, то принудительно сделать шаг 10нс. Иначе при очень маленькой ошибке курсор замирает на долгое время
							if(cursor_place_fixed < 1e-8)
								cursor_place_fixed = 1e-8;

							// Корректировка, отправка нового положения курсора и измерение напряжения в этой точке
							cursor_place = cursor_place_fixed + cursor_place;
							// p("cursor_place " + cursor_place * 1e6);
							TEK_Send("cursor:vbars:position2 " + cursor_place);
							ctou_tgt_u = parseFloat(TEK_Exec("cursor:vbars:hpos2?"));
							ctou_tgt_u.toFixed(1);
							//-----------------

							if (anykey()) return 0;						
						}
					cursor_place_prev10 = cursor_place - 800e-9; // отнять 1100 нс с текущего курсора для следующего измерения

					var tgt_sc = TEK_Exec("cursor:vbars:delta?") * 1e6;
					print("tgt osc = " + tgt_sc.toFixed(2));
				}
				//-----------------

				print("Погр изм tgd, %: " + (((tgd_read / 1000) - tgd_sc) / tgd_sc * 100).toFixed(3));
				print("Погр изм tgt, %: " + (((tgt_read / 1000) - tgt_sc) / tgt_sc * 100).toFixed(3));



				ctou_tgd_sc.push(tgd_sc.toFixed(2));
				ctou_tgt_sc.push(tgt_sc.toFixed(2));
			}
			else
			{
				var i_sc = Math.round(CTOU_Measure(ctou_chMeasureI, "4") / ctou_Ri, 3);
				ctou_i_sc.push(i_sc);
				print("Itek, A: " + i_sc);
				print("Погр изм, %: " + ((i_read - i_sc) / i_sc * 100).toFixed(2));
				print("Погр set, %: " + ((i_sc - CurrentValues[j]) / CurrentValues[j] * 100).toFixed(2));
			}
			
			
			// Relative error
			if(ctou_measure_time)
			{
				ctou_tgd_err.push((((tgd_read / 1000) - tgd_sc) / tgd_sc * 100).toFixed(2));
				ctou_tgt_err.push((((tgt_read / 1000) - tgt_sc) / tgt_sc * 100).toFixed(2));
				tgd_read = 0;
				tgt_read = 0;
				//sleep(1000);
			}
			else
			{
				ctou_i_err.push(((i_read - i_sc) / i_sc * 100).toFixed(2));
				ctou_iset_err.push(((i_sc - CurrentValues[j]) / CurrentValues[j] * 100).toFixed(2));
				//sleep(1000);
			}			
			print("--------------------");
			
			if (anykey()) return 0;
		}
	}
	return 1;
}

function CTOU_TekScale(Channel, Value)
{
	// 0.7 - use 70% of full range
	// 7 - number of scope grids in full scale
	var scale = (Value / (0.8 * 7)).toFixed(2);
	TEK_Send("ch" + Channel + ":scale " + parseFloat(scale).toExponential());
}

function CTOU_ResetA()
{
	// Results storage
	ctou_i = [];
	ctou_tgt = [];
	ctou_tgd = [];
	ctou_i_set = [];

	// Tektronix data
	ctou_i_sc = [];
	ctou_tgt_sc = [];
	ctou_tgd_sc = [];

	// Relative error
	ctou_i_err = [];
	ctou_iset_err = [];
	ctou_tgt_err = [];
	ctou_tgd_err = [];

	// Correction
	ctou_i_corr = [];
}

function CTOU_SaveI(NameI)
{
	CGEN_SaveArrays(NameI, ctou_i, ctou_i_sc, ctou_i_err);
}

function CTOU_SaveIset(NameIset)
{
	CGEN_SaveArrays(NameIset, ctou_i, ctou_i_set, ctou_iset_err);
}

function CTOU_SaveTgt(NameTgt)
{
	CGEN_SaveArrays(NameTgt, ctou_tgt, ctou_tgt_sc, ctou_tgt_err);
}

function CTOU_SaveTgd(NameTgd)
{
	CGEN_SaveArrays(NameTgd, ctou_tgd, ctou_tgd_sc, ctou_tgd_err);
}

function CTOU_PrintICal()
{
	print("I P2 x1e6:	" + dev.rs(7));
	print("I P1 x1000:	" + dev.r(6));
	print("I P0 x1000:	" + dev.rs(5));
}

function CTOU_ResetCal()
{
	CTOU_CalI(0, 1, 0);
}

function CTOU_CalI(P2, P1, P0)
{
	dev.ws(7, Math.round(P2 * 1e6));
	dev.w(6, Math.round(P1 * 1000));
	dev.ws(5, Math.round(P0));
}
