include("TestGTU.js")
include("Tektronix.js")
include("CalGeneral.js")

// Global definitions
// Конфигурация режима блока
cgtu_Mode2Wire = 0;					// Старые двухпроводные блоки
cgtu_Mode4WirePEX = 1;				// Четырёхпроводные блоки для Powerex
cgtu_Mode4WireIncompatible = 2;		// Четырёхпроводные блоки, комбинированный режим (неактивная ветка)
cgtu_Mode4WireCompatible = 3;		// Четырёхпроводные блоки, совместимые по управлению с двухпроводными (основная ветка)
// Выбор режима автоматически выполняется в CGTU_Init()
cgtu_Mode = cgtu_Mode4WireCompatible;

cgtu_Res = 10;  // in Ohms

// Range select
// Границы диапазонов указаны для справки. Фактические значения хранятся в соответстующих регистрах
cgtu_RangeIgt = 1;    // 0 = Range [ < 50 mA];  1 = Range [ > 50 mA] for measure & set
cgtu_RangeVgt = 1;    // 0 = Range [ < 500 mV]; 1 = Range [ > 500 mV] for measure & set

// Current limits
cgtu_Imax = 1000;
cgtu_Imin = 50;

// Voltage limits
cgtu_Vmax = 12000;    // in mV
cgtu_Vmin = 2000;     // in mV

// Counters
cgtu_cntTotal = 0;
cgtu_cntDone = 0;
//
cgtu_UseAvg = 0;
cgtu_UseRangeTuning = 1;
cgtu_PlotSummaryError = 0;

// Results storage
cgtu_igt = [];
cgtu_vgt = [];
cgtu_vd = [];
cgtu_id = [];
cgtu_vd_set = [];
cgtu_vgt_set = [];
cgtu_igt_set = [];
cgtu_id_set = [];

// Tektronix data
cgtu_igt_sc = [];
cgtu_vgt_sc = [];
cgtu_vd_sc = [];
cgtu_id_sc = [];

// Relative error
cgtu_igt_err = [];
cgtu_vgt_err = [];
cgtu_vd_err = [];
cgtu_id_err = [];
cgtu_vgt_set_err = [];
cgtu_vd_set_err = [];
cgtu_igt_set_err = [];
cgtu_id_set_err = [];

// Summary error
cgtu_igt_err_sum = [];
cgtu_vgt_err_sum = [];
cgtu_vd_err_sum = [];
cgtu_id_err_sum = [];
cgtu_vgt_set_err_sum = [];
cgtu_vd_set_err_sum = [];
cgtu_igt_set_err_sum = [];
cgtu_id_set_err_sum = [];

// Correction
cgtu_igt_corr = [];
cgtu_vgt_corr = [];
cgtu_vd_corr = [];
cgtu_id_corr = [];
cgtu_vd_set_corr = [];
cgtu_vgt_set_corr = [];
cgtu_igt_set_corr = [];
cgtu_id_set_corr = [];

// Channels
cgtu_chMeasure = 1;
cgtu_chMeasurePower = 1;
cgtu_chSync = 3;

// Iterations
cgtu_Iterations = 1;

// Measurement errors
cgtu_EUosc = 3;
cgtu_ER2Wire = 1;
cgtu_ER4Wire = 0.1;
cgtu_ER = (cgtu_Mode == cgtu_Mode2Wire) ? cgtu_ER2Wire : cgtu_ER4Wire;

// Функция знака с учётом формул МА
Math.sign_ma = function(x)
{
	if (x < 0)
		return -1;
	else
		return 1;
}

function CGTU_GetBaseReg(ProbeCMD)
{
	switch (ProbeCMD)
	{
		case 110:	// VG
			return 130;

		case 111:	// IG
			return 131;

		case 112:	// VD
			return 128;

		case 113:	// ID
			return 129;
	}
}

function CGTU_Probe(ProbeCMD)
{
	// Acquire mode
	var AvgNum;
	if (cgtu_UseAvg)
	{
		AvgNum = 4;
		TEK_AcquireAvg(AvgNum);
	}
	else
	{
		AvgNum = 1;
		TEK_AcquireSample();
	}
	sleep(500);
	
	// Переопределение команд для режимо совместиомсти
	var AlterProbeCMD = ProbeCMD;
	if(cgtu_Mode == cgtu_Mode4WireCompatible || cgtu_Mode == cgtu_Mode2Wire)
	{
		if(ProbeCMD == 111)
			AlterProbeCMD = 110;
		else if(ProbeCMD == 113)
			AlterProbeCMD = 111;
	}
	for (var i = 0; i < (cgtu_UseAvg ? (AvgNum + 1) : 1); i++)
	{
		dev.c(AlterProbeCMD);
		while (dev.r(192) != 0) sleep(50);
		sleep(500);
	}
	sleep(1000);
	
	// Вспомогательные функции
	// Измеренное значение из блока
	function GetMeasuredVal()
	{
		if((cgtu_Mode == cgtu_Mode4WireCompatible || cgtu_Mode == cgtu_Mode2Wire) && ProbeCMD == 110)
			return dev.r(205) + dev.r(234) / 1000;
		else
			return dev.r(204) + dev.r(233) / 1000;
	}
	// Измеренное значение осциллографом
	function GetScopeVal()
	{
		return CGTU_Measure(cgtu_chMeasure) / ((ProbeCMD == 110 || ProbeCMD == 112) ? 1 : cgtu_Res);
	}
	// Задание
	function GetSetVal()
	{
		if(cgtu_Mode == cgtu_Mode4WireCompatible || cgtu_Mode == cgtu_Mode2Wire)
			return dev.r(140);
		else
			return dev.r(CGTU_GetBaseReg(ProbeCMD) + (cgtu_Mode == cgtu_Mode4WireIncompatible ? 3 : 0));
	}
	// Рассчёт суммарной погрешности
	function CalculateSumError(rel_error)
	{
		if(cgtu_Mode == cgtu_Mode2Wire)
		{
			if(ProbeCMD == 110 || ProbeCMD == 112)
				// Группа погрешностей по напряжению
				return 1.1 * Math.sqrt(Math.pow(rel_error, 2) + Math.pow(cgtu_EUosc, 2));
			else
				// Группа погрешностей по току
				return 1.1 * Math.sqrt(Math.pow(rel_error, 2) + Math.pow(cgtu_EUosc, 2) + Math.pow(cgtu_ER, 2));
		}
		else
		{
			if(ProbeCMD == 110 || ProbeCMD == 112)
				// Группа погрешностей по напряжению
				return Math.sign_ma(rel_error) * (Math.abs(rel_error) + cgtu_EUosc);
			else
				// Группа погрешностей по току
				return Math.sign_ma(rel_error) * (Math.abs(rel_error) + 1.1 * Math.sqrt(Math.pow(cgtu_EUosc, 2) + Math.pow(cgtu_ER, 2)));
		}
	}
	
	// Данные из блока и СИ
	var val = GetMeasuredVal();
	var val_sc = GetScopeVal();
	var val_set = GetSetVal();
	
	// Расчёт погрешности
	var val_err = (val - val_sc) / val_sc * 100;
	var val_set_err = (val_sc - val_set) / val_set * 100;
	
	var val_err_sum = CalculateSumError(val_err);
	var val_set_err_sum = CalculateSumError(val_set_err);

	// Сохранение
	val = val.toFixed(2);
	val_sc = val_sc.toFixed(2);
	val_set = val_set.toFixed(2);
	
	val_err = val_err.toFixed(2);
	val_err_sum = val_err_sum.toFixed(2);
	val_set_err = val_set_err.toFixed(2);
	val_set_err_sum = val_set_err_sum.toFixed(2);
	
	var UseSetError = !((cgtu_Mode == cgtu_Mode4WireCompatible || cgtu_Mode == cgtu_Mode2Wire) && ProbeCMD == 110);
	switch(ProbeCMD)
	{
		case 110:
			cgtu_vgt.push(val);
			cgtu_vgt_sc.push(val_sc);
			cgtu_vgt_set.push(val_set);
			
			cgtu_vgt_err.push(val_err);
			cgtu_vgt_err_sum.push(val_err_sum);
			
			if(UseSetError)
			{
				cgtu_vgt_set_err.push(val_set_err);
				cgtu_vgt_set_err_sum.push(val_set_err_sum)
			}
			break;
		
		case 111:
			cgtu_igt.push(val);
			cgtu_igt_sc.push(val_sc);
			cgtu_igt_set.push(val_set);
			
			cgtu_igt_err.push(val_err);
			cgtu_igt_err_sum.push(val_err_sum);
			
			cgtu_igt_set_err.push(val_set_err);
			cgtu_igt_set_err_sum.push(val_set_err_sum)
			break;
		
		case 112:
			cgtu_vd.push(val);
			cgtu_vd_sc.push(val_sc);
			cgtu_vd_set.push(val_set);
			
			cgtu_vd_err.push(val_err);
			cgtu_vd_err_sum.push(val_err_sum);
			
			cgtu_vd_set_err.push(val_set_err);
			cgtu_vd_set_err_sum.push(val_set_err_sum)
			break;
		
		case 113:
			cgtu_id.push(val);
			cgtu_id_sc.push(val_sc);
			cgtu_id_set.push(val_set);
			
			cgtu_id_err.push(val_err);
			cgtu_id_err_sum.push(val_err_sum);
			
			cgtu_id_set_err.push(val_set_err);
			cgtu_id_set_err_sum.push(val_set_err_sum)
			break;
	}
	
	// Вывод
	var Letter = (ProbeCMD == 110 || ProbeCMD == 112) ? "V" : "I";
	var Unit = (ProbeCMD == 110 || ProbeCMD == 112) ? "V" : "A";
	
	var LetterSet = (cgtu_Mode == cgtu_Mode4WireCompatible || cgtu_Mode == cgtu_Mode2Wire) ? "I" : Letter;
	var UnitSet = (cgtu_Mode == cgtu_Mode4WireCompatible || cgtu_Mode == cgtu_Mode2Wire) ? "A" : Unit;
	
	print(LetterSet + "set,       m" + UnitSet + ": " + val_set);
	print(Letter + "tek,       m" + Unit + ": " + val_sc);
	print(Letter + "unit,      m" + Unit + ": " + val);
	print(Letter + "unit_err,   %: " + val_err);
	print(Letter + "unit_err_s, %: " + val_err_sum);
	if(UseSetError)
	{
		print(Letter + "set_err,    %: " + val_set_err);
		print(Letter + "set_err_s,  %: " + val_set_err_sum);
	}

	cgtu_cntDone++;
	print("-- result " + cgtu_cntDone + " of " + cgtu_cntTotal + " --");
	
	sleep(500);
}

function CGTU_TriggerTune()
{
	TEK_Send("trigger:main:pulse:width:polarity negative");
	TEK_Send("trigger:main:pulse:width:width" + (cgtu_Mode == cgtu_Mode2Wire ? "50e-3" : "5e-3"));
}

function CGTU_TekCursor(Channel)
{
	TEK_Send("cursor:select:source ch" + Channel);
	TEK_Send("cursor:function vbars");
	TEK_Send("cursor:vbars:position1" + (cgtu_Mode == cgtu_Mode2Wire ? "-60e-3" : "-6e-3"));
	TEK_Send("cursor:vbars:position2 0");
}

function CGTU_TekScale(Channel, Value)
{
	if (cgtu_Mode == cgtu_Mode2Wire)
	{
		TEK_ChannelScale(Channel, Value);
	}
	else
	{
		// 0.9 - use 90% of full range
		// 8 - number of scope grids in full scale
		var scale = (Value / (8 * 0.8));
		TEK_Send("ch" + Channel + ":scale " + scale);
	}
}

function CGTU_Measure(Channel)
{
	TEK_Send("cursor:select:source ch" + Channel);
	sleep(500);
	
	var f = TEK_Exec("cursor:vbars:hpos1?");
	if (Math.abs(f) > 2e+4)
		f = 0;
	return Math.round(f * 1000);
}

// Reset Arrays
function CGTU_ResetA()
{
	// Results storage
	cgtu_igt = [];
	cgtu_vgt = [];
	cgtu_vd = [];
	cgtu_id = [];
	cgtu_vd_set = [];
	cgtu_vgt_set = [];
	cgtu_igt_set = [];
	cgtu_id_set = [];

	// Tektronix data
	cgtu_igt_sc = [];
	cgtu_vgt_sc = [];
	cgtu_vd_sc = [];
	cgtu_id_sc = [];

	// Relative error
	cgtu_igt_err = [];
	cgtu_vgt_err = [];
	cgtu_vd_err = [];
	cgtu_id_err = [];
	cgtu_vgt_set_err = [];
	cgtu_vd_set_err = [];
	cgtu_igt_set_err = [];
	cgtu_id_set_err = [];

	// Summary error
	cgtu_igt_err_sum = [];
	cgtu_vgt_err_sum = [];
	cgtu_vd_err_sum = [];
	cgtu_id_err_sum = [];
	cgtu_vgt_set_err_sum = [];
	cgtu_vd_set_err_sum = [];
	cgtu_igt_set_err_sum = [];
	cgtu_id_set_err_sum = [];

	// Correction
	cgtu_igt_corr = [];
	cgtu_vgt_corr = [];
	cgtu_vd_corr = [];
	cgtu_id_corr = [];
	cgtu_vd_set_corr = [];
	cgtu_vgt_set_corr = [];
	cgtu_igt_set_corr = [];
	cgtu_id_set_corr = [];
}

function CGTU_Init(portGate, portTek, channelMeasure, channelSyncOrMeasurePower)
{
	CGTU_DefineUnitMode();
	// Выбор максимального тока
	cgtu_ER = (cgtu_Mode == cgtu_Mode2Wire) ? cgtu_ER2Wire : cgtu_ER4Wire;

	if (channelMeasure < 1 || channelMeasure > 4 ||
		channelSyncOrMeasurePower < 1 || channelSyncOrMeasurePower > 4)
	{
		print("Wrong channel numbers");
		return;
	}
	
	cgtu_chMeasure = channelMeasure;

	// Copy channel information
	if (cgtu_Mode == cgtu_Mode2Wire)
		cgtu_chMeasurePower = channelSyncOrMeasurePower;
	else
		cgtu_chSync = channelSyncOrMeasurePower;

	// Init GTU
	if(portGate)
	{
		dev.Disconnect();
		dev.co(portGate);
	}
	
	// Init Tektronix
	if(portTek)
		TEK_PortInit(portTek);

	// Tektronix init
	// Init channels
	TEK_ChannelInit(cgtu_chMeasure, "1", "1");
	
	TEK_ChannelInit(cgtu_Mode == cgtu_Mode2Wire ? cgtu_chMeasurePower : cgtu_chSync, "1", "1");
	// Init trigger
	TEK_TriggerPulseInit(cgtu_Mode == cgtu_Mode2Wire ? cgtu_chMeasure : cgtu_chSync, cgtu_Mode == cgtu_Mode2Wire ? "1" : "2.5");
	CGTU_TriggerTune();
	// Horizontal settings
	TEK_Horizontal(cgtu_Mode == cgtu_Mode2Wire ? "1e-3" : "10e-3", cgtu_Mode == cgtu_Mode2Wire ? "-40e-3" : "-4e-3");
	
	// Display channels
	for (var i = 1; i <= 4; i++)
	{
		if (i == cgtu_chMeasure || i == cgtu_chSync || i == cgtu_chMeasurePower)
			TEK_ChannelOn(i);
		else
			TEK_ChannelOff(i);
	}

	// Init measurement
	CGTU_TekCursor(cgtu_chMeasure);
	if (cgtu_Mode == cgtu_Mode2Wire)
		CGTU_TekCursor(cgtu_chMeasurePower);
}

function CGTU_Collect(ProbeCMD, Resistance, cgtu_Values, IterationsCount)
{
	cgtu_cntTotal = IterationsCount * cgtu_Values.length;
	cgtu_cntDone = 0;

	if (cgtu_Mode == cgtu_Mode2Wire)
	{
		TEK_TriggerPulseInit((ProbeCMD == 110) ? cgtu_chMeasure : cgtu_chMeasurePower, "1");
		CGTU_TriggerTune();

		CGTU_TekScale((ProbeCMD == 110) ? cgtu_chMeasure : cgtu_chMeasurePower, cgtu_Imax * Resistance / 1000);
	}
	else if (!cgtu_UseRangeTuning)
	{
		// Configure scale
		switch (ProbeCMD)
		{
			case 110:
				CGTU_TekScale(cgtu_chMeasure, cgtu_Vmax / 1000);
				break;

			case 111:
				CGTU_TekScale(cgtu_chMeasure, cgtu_Imax * Resistance / 1000);
				break;

			case 112:
				CGTU_TekScale(cgtu_chMeasure, cgtu_Vmax / 1000);
				break;

			case 113:
				CGTU_TekScale(cgtu_chMeasure, cgtu_Imax * Resistance / 1000);
				break;
		}
	}
	sleep(500);

	for (var i = 0; i < IterationsCount; i++)
	{
		for (var j = 0; j < cgtu_Values.length; j++)
		{
			// При активной подстройке масштаба
			if (cgtu_UseRangeTuning)
			{
				if (cgtu_Mode == cgtu_Mode2Wire)
					CGTU_TekScale((ProbeCMD == 110) ? cgtu_chMeasure : cgtu_chMeasurePower, cgtu_Values[j] * Resistance / 1000);
				else
				{
					var ResMul = (cgtu_Mode == cgtu_Mode4WireCompatible || ProbeCMD == 111 || ProbeCMD == 113) ? Resistance : 1;
					var ScaleValue = cgtu_Values[j] / 1000 * ResMul;
					CGTU_TekScale(cgtu_chMeasure, ScaleValue);
				}
				sleep(2000);
			}
			
			// Подстройка триггера в двухпроводном режиме
			if (cgtu_Mode == cgtu_Mode2Wire)
			{
				TEK_TriggerLevelF(cgtu_Values[j] * Resistance / (1000 * 2));
				sleep(1000);
			}
			
			// Запись задания
			if(cgtu_Mode == cgtu_Mode4WireCompatible || cgtu_Mode == cgtu_Mode2Wire)
				dev.w(140, cgtu_Values[j]);
			else
			{
				var BaseReg = CGTU_GetBaseReg(ProbeCMD);
				dev.w(BaseReg + (cgtu_Mode == cgtu_Mode4WireIncompatible ? 3 : 0) , cgtu_Values[j]);
			}
			
			CGTU_Probe(ProbeCMD);
			if (anykey()) return 0;
		}
	}

	return 1;
}

function CGTU_CalVGT(P2, P1, P0)
{
	if (cgtu_Mode == cgtu_Mode2Wire)
	{
		if (CGEN_UseQuadraticCorrection())
		{
			dev.ws(50, Math.round(P2 * 1e6));
			dev.w(51, Math.round(P1 * 1000));
			dev.ws(57, Math.round(P0));
		}
		else
		{
			dev.w(52, Math.round(P1 * 1000));
			dev.w(53, 1000);
			dev.ws(56, Math.round(P0));
		}
	}
	else
	{
		switch (cgtu_RangeVgt)
		{
			case 0:
				dev.ws(102, Math.round(P2 * 1e6));
				dev.w(103, Math.round(P1 * 1000));
				dev.ws(104, Math.round(P0));
				break;
			case 1:
				dev.ws(28, Math.round(P2 * 1e6));
				dev.w(29, Math.round(P1 * 1000));
				dev.ws(30, Math.round(P0));
				break;
			default:
				print("Incorrect Vgt range.");
				break;
		}
	}
}

function CGTU_CalIGT(P2, P1, P0)
{
	if (cgtu_Mode == cgtu_Mode2Wire)
	{
		if (CGEN_UseQuadraticCorrection())
		{
			dev.ws(50, Math.round(P2 * 1e6));
			dev.w(51, Math.round(P1 * 1000));
			dev.ws(57, Math.round(P0));
		}
		else
		{
			dev.w(50, Math.round(P1 * 1000));
			dev.w(51, 1000);
			dev.ws(57, Math.round(P0));
		}
	}
	else
	{
		switch (cgtu_RangeIgt)
		{
			case 0:
				dev.ws(115, Math.round(P2 * 1e6));
				dev.w(116, Math.round(P1 * 1000));
				dev.ws(117, Math.round(P0));
				break;
			case 1:
				dev.ws(33, Math.round(P2 * 1e6));
				dev.w(34, Math.round(P1 * 1000));
				dev.ws(35, Math.round(P0));
				break;
			default:
				print("Incorrect Igt range.");
				break;
		}
	}
}

function CGTU_CalibrateIGate()
{
	// Collect data
	CGTU_SetLimits();
	CGTU_ResetA();
	CGTU_ResetIGateCal();

	if (CGTU_CollectIGate(cgtu_Iterations))
	{
		CGTU_SaveIGate("gtu_igt", "gtu_igt_set");

		// Plot relative error distribution
		scattern(cgtu_igt_sc, cgtu_igt_err, "Igt (in mA)", "Error (in %)", "Igt relative error");
		scattern(cgtu_igt_sc, cgtu_igt_set_err, "Igt (in mA)", "Error (in %)", "Igt set relative error");

		// Calculate correction
		var LinearCorrection = cgtu_Mode == cgtu_Mode2Wire && !CGEN_UseQuadraticCorrection()
		if (LinearCorrection)
		{
			cgtu_igt_corr = CGEN_GetCorrection("gtu_igt");
			CGTU_CalIGT(null, cgtu_igt_corr[0], cgtu_igt_corr[1]);
		}
		else
		{
			cgtu_igt_corr = CGEN_GetCorrection2("gtu_igt");
			CGTU_CalIGT(cgtu_igt_corr[0], cgtu_igt_corr[1], cgtu_igt_corr[2]);

			if (cgtu_Mode != cgtu_Mode2Wire)
			{
				cgtu_igt_set_corr = CGEN_GetCorrection2("gtu_igt_set");
				CGTU_CalSetIGT(cgtu_igt_set_corr[0], cgtu_igt_set_corr[1], cgtu_igt_set_corr[2]);
			}
		}

		// Print correction
		CGTU_PrintIGateCal();
		CGTU_PrintIGateSetCal();
	}
}

function CGTU_VerifyIGate()
{
	// Collect corrected data
	CGTU_ResetA();

	if (CGTU_CollectIGate(cgtu_Iterations))
	{
		CGTU_SaveIGate("gtu_igt_fixed", "gtu_igt_set_fixed");
		
		// Plot relative error distribution
		scattern(cgtu_igt_sc, cgtu_igt_err, "Igt (in mA)", "Error (in %)", "Igt relative error"); sleep(200);
		scattern(cgtu_igt_sc, cgtu_igt_set_err, "Igt set (in mA)", "Error (in %)", "Igt set relative error");
		
		// Plot summary error distribution
		if (cgtu_PlotSummaryError)
		{
			scattern(cgtu_igt_sc, cgtu_igt_err_sum, "Igt (in mA)", "Error (in %)", "Igt summary error");sleep(200);
			scattern(cgtu_igt_sc, cgtu_igt_set_err_sum, "Igt set (in mA)", "Error (in %)", "Igt set summary error");
		}
	}
}

function CGTU_CalibrateIPower()
{
	// Collect data
	CGTU_SetLimits();
	CGTU_ResetA();
	CGTU_ResetIPowerCal();
	
	if (CGTU_CollectIPower(cgtu_Iterations))
	{
		CGTU_SaveIPower("gtu_id", "gtu_id_set");
		
		// Plot relative error distribution
		scattern(cgtu_id_sc, cgtu_id_err, "Id (in mA)", "Error (in %)", "Id relative error");
		scattern(cgtu_id_sc, cgtu_id_set_err, "Id set (in mA)", "Error (in %)", "Id set relative error");
		
		// Calculate correction
		var LinearCorrection = cgtu_Mode == cgtu_Mode2Wire && !CGEN_UseQuadraticCorrection()
		if (LinearCorrection)
		{
			cgtu_id_corr = CGEN_GetCorrection2("gtu_id");
			CGTU_CalID(null, cgtu_id_corr[0], cgtu_id_corr[1]);
		}
		else
		{
			cgtu_id_corr = CGEN_GetCorrection2("gtu_id");
			CGTU_CalID(cgtu_id_corr[0], cgtu_id_corr[1], cgtu_id_corr[2]);

			if (cgtu_Mode != cgtu_Mode2Wire)
			{
				cgtu_id_set_corr = CGEN_GetCorrection2("gtu_id_set");
				CGTU_CalSetID(cgtu_id_set_corr[0], cgtu_id_set_corr[1], cgtu_id_set_corr[2]);
			}
		}
		
		// Print correction
		CGTU_PrintIPowerCal();
		CGTU_PrintIPowerSetCal();
	}
}

function CGTU_VerifyIPower()
{
	// Collect corrected data
	CGTU_ResetA();

	if (CGTU_CollectIPower(cgtu_Iterations))
	{
		CGTU_SaveIPower("gtu_id_fixed", "gtu_id_set_fixed");
		
		// Plot relative error distribution
		scattern(cgtu_id_sc, cgtu_id_err, "Id (in mA)", "Error (in %)", "Id relative error");
		scattern(cgtu_id_sc, cgtu_id_set_err, "Id set (in mA)", "Error (in %)", "Id set relative error");
		
		// Plot summary error distribution
		if (cgtu_PlotSummaryError)
		{
			scattern(cgtu_id_sc, cgtu_id_err_sum, "Id (in mA)", "Error (in %)", "Id summary error");
			scattern(cgtu_id_sc, cgtu_id_set_err_sum, "Id set (in mA)", "Error (in %)", "Id set summary error");
		}
	}
}

function CGTU_CalibrateVGate()
{
	// Collect data
	CGTU_SetLimits();
	CGTU_ResetA();
	CGTU_ResetVGateCal();
	
	if (CGTU_CollectVGate(cgtu_Iterations))
	{
		CGTU_SaveVGate("gtu_vgt");
		
		// Plot relative error distribution
		scattern(cgtu_vgt_sc, cgtu_vgt_err, "Vgt (in mV)", "Error (in %)", "Vgt relative error");
		if(cgtu_vgt_set_err.length)
			scattern(cgtu_vgt_sc, cgtu_vgt_set_err, "Vgt (in mV)", "Error (in %)", "Vgt set relative error");
		
		// Calculate correction
		var LinearCorrection = cgtu_Mode == cgtu_Mode2Wire && !CGEN_UseQuadraticCorrection()
		if (LinearCorrection)
		{
			cgtu_vgt_corr = CGEN_GetCorrection("gtu_vgt");
			CGTU_CalVGT(null, cgtu_vgt_corr[0], cgtu_vgt_corr[1]);
		}
		else
		{
			cgtu_vgt_corr = CGEN_GetCorrection2("gtu_vgt");
			CGTU_CalVGT(cgtu_vgt_corr[0], cgtu_vgt_corr[1], cgtu_vgt_corr[2]);
		}
		
		// Print correction
		CGTU_PrintVGateCal();
	}
}

function CGTU_VerifyVGate()
{
	// Collect corrected data
	CGTU_ResetA();

	if (CGTU_CollectVGate(cgtu_Iterations))
	{
		CGTU_SaveVGate("gtu_vgt_fixed");
		
		// Plot relative error distribution
		scattern(cgtu_vgt_sc, cgtu_vgt_err, "Vgt (in mV)", "Error (in %)", "Vgt relative error"); sleep(200);
		if(cgtu_vgt_set_err.length)
			scattern(cgtu_vgt_sc, cgtu_vgt_set_err, "Vgt (in mV)", "Error (in %)", "Vgt set relative error"); sleep(200);
		
		// Plot summary error distribution
		if (cgtu_PlotSummaryError)
		{
			scattern(cgtu_vgt_sc, cgtu_vgt_err_sum, "Vgt (in mV)", "Error (in %)", "Vgt summary error");sleep(200);
			if(cgtu_vgt_set_err_sum.length)
				scattern(cgtu_vgt_sc, cgtu_vgt_set_err_sum, "Vgt (in mV)", "Error (in %)", "Vgt set summary error");
		}
	}
}

function CGTU_CalibrateVPower()
{
	// Collect data
	CGTU_SetLimits();
	CGTU_ResetA();
	CGTU_ResetVPowerCal();
	
	if (CGTU_CollectVPower(cgtu_Iterations))
	{
		CGTU_SaveVPower("gtu_vd");
		
		// Plot relative error distribution
		scattern(cgtu_vd_sc, cgtu_vd_err, "Vd (in mV)", "Error (in %)", "Vd relative error");
		scattern(cgtu_vd_sc, cgtu_vd_set_err, "Vd (in mV)", "Error (in %)", "Vd set relative error");
		
		// Calculate correction		
		var LinearCorrection = cgtu_Mode == cgtu_Mode2Wire && !CGEN_UseQuadraticCorrection()
		if (LinearCorrection)
		{
			cgtu_vd_corr = CGEN_GetCorrection("gtu_vd");
			CGTU_CalVD(null, cgtu_vd_corr[0], cgtu_vd_corr[1]);
		}
		else
		{
			cgtu_vd_corr = CGEN_GetCorrection2("gtu_vd");
			CGTU_CalVD(cgtu_vd_corr[0], cgtu_vd_corr[1], cgtu_vd_corr[2]);
		}
		
		// Print correction
		CGTU_PrintVPowerCal();
	}
}

function CGTU_VerifyVPower()
{
	// Collect corrected data
	CGTU_ResetA();

	if (CGTU_CollectVPower(cgtu_Iterations))
	{
		CGTU_SaveVPower("gtu_vd_fixed");
		
		// Plot relative error distribution
		scattern(cgtu_vd_sc, cgtu_vd_err, "Vd (in mV)", "Error (in %)", "Vd relative error");
		scattern(cgtu_vd_sc, cgtu_vd_set_err, "Vd (in mV)", "Error (in %)", "Vd set relative error");
		
		// Plot summary error distribution
		if (cgtu_PlotSummaryError)
		{
			scattern(cgtu_vd_sc, cgtu_vd_err_sum, "Vd (in mV)", "Error (in %)", "Vd summary error");
			scattern(cgtu_vd_sc, cgtu_vd_set_err_sum, "Vd (in mV)", "Error (in %)", "Vd set summary error");
		}
	}
}

function CGTU_DefineUnitMode()
{
	// Определение рабочего режима по регистрам блока
	var ZeroRegs = true
	for (var i = 0; i < 5; i++)
		ZeroRegs = ZeroRegs && (dev.r(i) == 0);
	
	if(ZeroRegs)
		cgtu_Mode = cgtu_Mode2Wire;
	else if(dev.r(140) == 0)
		cgtu_Mode = cgtu_Mode4WirePEX;
	else if(dev.r(120) == 0)
		cgtu_Mode = cgtu_Mode4WireIncompatible;
	else
		cgtu_Mode = cgtu_Mode4WireCompatible;
}

function CGTU_CollectVGate(IterationsCount)
{
	CGTU_DefineUnitMode();
	
	if(cgtu_Mode == cgtu_Mode2Wire || cgtu_Mode == cgtu_Mode4WireCompatible)
	{
		var Istp = Math.round((cgtu_Imax - cgtu_Imin) / (cgtu_Points - 1));
		var Values = CGEN_GetRange(cgtu_Imin, cgtu_Imax, Istp);
	}
	else
	{
		var cgtu_Vgstp = Math.round((cgtu_Vmax - cgtu_Vmin) / (cgtu_Points - 1));
		var Values = CGEN_GetRange(cgtu_Vmin, cgtu_Vmax, cgtu_Vgstp);
	}
	return CGTU_Collect(110, cgtu_Res, Values, IterationsCount);
}

function CGTU_CollectIGate(IterationsCount)
{
	CGTU_DefineUnitMode();
	
	var Istp = Math.round((cgtu_Imax - cgtu_Imin) / (cgtu_Points - 1));
	var Values = CGEN_GetRange(cgtu_Imin, cgtu_Imax, Istp);
	print("Gate resistance set to " + cgtu_Res + " Ohms");
	print("-----------");
	return CGTU_Collect(111, cgtu_Res, Values, IterationsCount);
}

function CGTU_CollectVPower(IterationsCount)
{
	CGTU_DefineUnitMode();
	if(cgtu_Mode == cgtu_Mode2Wire || cgtu_Mode == cgtu_Mode4WireCompatible)
	{
		print("Not supported");
		return;
	}
	
	var cgtu_Vdstp = Math.round((cgtu_Vmax - cgtu_Vmin) / (cgtu_Points - 1));
	var cgtu_VoltageValues = CGEN_GetRange(cgtu_Vmin, cgtu_Vmax, cgtu_Vdstp);

	return CGTU_Collect(112, cgtu_Res, cgtu_VoltageValues, IterationsCount);
}

function CGTU_CollectIPower(IterationsCount)
{
	CGTU_DefineUnitMode();
	
	var Istp = Math.round((cgtu_Imax - cgtu_Imin) / (cgtu_Points - 1));
	var Values = CGEN_GetRange(cgtu_Imin, cgtu_Imax, Istp);
	print("Power resistance set to " + cgtu_Res + " Ohms");
	print("-----------");
	return CGTU_Collect(113, cgtu_Res, Values, IterationsCount);
}

function CGTU_SetLimits()
{
	if(cgtu_Mode == cgtu_Mode4WirePEX || cgtu_Mode == cgtu_Mode4WireIncompatible)
	{
		dev.w(128 + (cgtu_Mode == cgtu_Mode4WireIncompatible ? 3 : 0) , cgtu_Vmax);
		dev.w(129 + (cgtu_Mode == cgtu_Mode4WireIncompatible ? 3 : 0) , cgtu_Imax);
		dev.w(130 + (cgtu_Mode == cgtu_Mode4WireIncompatible ? 3 : 0) , cgtu_Vmax);
		dev.w(131 + (cgtu_Mode == cgtu_Mode4WireIncompatible ? 3 : 0) , cgtu_Imax);
	}
}

// Save
function CGTU_SaveVGate(Name)
{
	CGEN_SaveArrays(Name, cgtu_vgt, cgtu_vgt_sc, cgtu_vgt_err);
}

function CGTU_SaveIGate(NameIgt, NameIgt_Set)
{
	CGEN_SaveArrays(NameIgt, cgtu_igt, cgtu_igt_sc, cgtu_igt_err, cgtu_igt_err_sum);
	CGEN_SaveArrays(NameIgt_Set, cgtu_igt_sc, cgtu_igt_set, cgtu_igt_set_err, cgtu_igt_err_sum);
}

function CGTU_SaveVPower(Name)
{
	CGEN_SaveArrays(Name, cgtu_vd, cgtu_vd_sc, cgtu_vd_err);
}

function CGTU_SaveIPower(NameId, NameId_Set)
{
	CGEN_SaveArrays(NameId, cgtu_id, cgtu_id_sc, cgtu_id_err, cgtu_id_err_sum);
	CGEN_SaveArrays(NameId_Set, cgtu_id_sc, cgtu_id_set, cgtu_id_set_err);
}

// Cal
function CGTU_CalSetIGT(P2, P1, P0)
{
	switch (cgtu_RangeIgt)
	{
		case 0:
			dev.ws(105, Math.round(P2 * 1e6));
			dev.w(106, Math.round(P1 * 1000));
			dev.ws(107, Math.round(P0));
			break;
		case 1:
			dev.ws(47, Math.round(P2 * 1e6));
			dev.w(48, Math.round(P1 * 1000));
			dev.ws(49, Math.round(P0));
			break;
		default:
			print("Incorrect Igt set range.");
			break;
	}
}

function CGTU_CalVD(P2, P1, P0)
{
	dev.ws(18, Math.round(P2 * 1e6));
	dev.w(19, Math.round(P1 * 1000));
	dev.ws(20, Math.round(P0));
}

function CGTU_CalID(P2, P1, P0)
{
	if (cgtu_Mode == cgtu_Mode2Wire)
	{
		if (CGEN_UseQuadraticCorrection())
		{
			dev.ws(33, Math.round(P2 * 1e6));
			dev.w(34, Math.round(P1 * 1000));
			dev.ws(35, Math.round(P0));
		}
		else
		{
			dev.w(33, Math.round(P1 * 1000));
			dev.w(34, 1000);
			dev.ws(35, Math.round(P0));
		}
	}
	else
	{
		dev.ws(23, Math.round(P2 * 1e6));
		dev.w(24, Math.round(P1 * 1000));
		dev.ws(25, Math.round(P0));
	}
}

function CGTU_CalSetID(P2, P1, P0)
{
	dev.ws(40, Math.round(P2 * 1e6));
	dev.w(41, Math.round(P1 * 1000));
	dev.ws(42, Math.round(P0));
}

// Print
function CGTU_PrintVGateCal()
{
	if (cgtu_Mode == cgtu_Mode2Wire)
	{
		if (CGEN_UseQuadraticCorrection())
		{
			print("VGT P2 x1e6:	" + dev.rs(52));
			print("VGT P1 x1000:	" + dev.r(53));
			print("VGT P0:		" + dev.rs(56));
		}
		else
		{
			print("VGT K:		" + (dev.r(52) / dev.r(53)));
			print("VGT Offset:	" + dev.rs(56));
		}
	}
	else
	{
		switch (cgtu_RangeVgt)
		{
			case 0:
				print("VGT0 P2 x1e6:	" + dev.rs(102));
				print("VGT0 P1 x1000:	" + dev.r(103));
				print("VGT0 P0:	" + dev.rs(104));
				break;
			case 1:
				print("VGT1 P2 x1e6:	" + dev.rs(28));
				print("VGT1 P1 x1000:	" + dev.r(29));
				print("VGT1 P0:	" + dev.rs(30));
				break;
			default:
				print("Incorrect Vgt range.");
				break;
		}
	}
}

function CGTU_PrintIGateCal()
{
	if (cgtu_Mode == cgtu_Mode2Wire)
	{
		if (CGEN_UseQuadraticCorrection())
		{
			print("IGT P2 x1e6:	" + dev.rs(50));
			print("IGT P1 x1000:	" + dev.r(51));
			print("IGT P0:		" + dev.rs(57));
		}
		else
		{
			print("IGT K:		" + (dev.r(50) / dev.r(51)));
			print("IGT Offset:	" + dev.rs(57));
		}
	}
	else
	{
		switch (cgtu_RangeIgt)
		{
			case 0:
				print("IGT0 P2 x1e6:	" + dev.rs(115));
				print("IGT0 P1 x1000:	" + dev.r(116));
				print("IGT0 P0:		" + dev.rs(117));
				break;
			case 1:
				print("IGT1 P2 x1e6:	" + dev.rs(33));
				print("IGT1 P1 x1000:	" + dev.r(34));
				print("IGT1 P0:		" + dev.rs(35));
				break;
			default:
				print("Incorrect Igt range.");
				break;
		}
	}
}

function CGTU_PrintIGateSetCal()
{
	switch (cgtu_RangeIgt)
	{
		case 0:
			print("IGT0 set P2 x1e6:	" + dev.rs(105));
			print("IGT0 set P1 x1000:	" + dev.r(106));
			print("IGT0 set P0:		" + dev.rs(107));
			break;
		case 1:
			print("IGT1 set P2 x1e6:	" + dev.rs(47));
			print("IGT1 set P1 x1000:	" + dev.r(48));
			print("IGT1 set P0:		" + dev.rs(49));
			break;
		default:
			print("Incorrect Igt range.");
			break;
	}
}

function CGTU_PrintVPowerCal()
{
	print("VD P2 x1e6:	" + dev.rs(18));
	print("VD P1 x1000:	" + dev.r(19));
	print("VD P0:		" + dev.rs(20));
}

function CGTU_PrintIPowerCal()
{
	if (cgtu_Mode == cgtu_Mode2Wire)
	{
		if (CGEN_UseQuadraticCorrection())
		{
			print("ID  P2 x1e6:	" + dev.rs(33));
			print("ID  P1 x1000:	" + dev.r(34));
			print("ID  P0:		" + dev.rs(35));
		}
		else
		{
			print("ID  K:		" + (dev.r(33) / dev.r(34)));
			print("ID  Offset:	" + dev.rs(35));
		}
	}
	else
	{
		print("ID P2 x1e6:	" + dev.rs(23));
		print("ID P1 x1000:	" + dev.r(24));
		print("ID P0:		" + dev.rs(25));
	}
}

function CGTU_PrintIPowerSetCal()
{
	print("ID set  P2 x1e6:	" + dev.rs(40));
	print("ID set  P1 x1000:	" + dev.r(41));
	print("ID set  P0:		" + dev.rs(42));
}

// Reset
function CGTU_ResetVGateCal()
{
	CGTU_CalVGT(0, 1, 0);

	if (cgtu_Mode == cgtu_Mode2Wire)
		dev.w(95, 0);
}

function CGTU_ResetIGateCal()
{
	CGTU_CalIGT(0, 1, 0);
	if (cgtu_Mode != cgtu_Mode2Wire)
		CGTU_CalSetIGT(0, 1, 0);
}

function CGTU_ResetVPowerCal()
{
	CGTU_CalVD(0, 1, 0);
}

function CGTU_ResetIPowerCal()
{
	CGTU_CalID(0, 1, 0);
	if (cgtu_Mode != cgtu_Mode2Wire)
		CGTU_CalSetID(0, 1, 0);
}

// HMIU calibration
function Measuring_Filter()
{
	allowedMeasuring = "TPS2000";
	return allowedMeasuring;
}

function CGTU_Initialize()
{
	CGTU_Init(null, null, channelMeasure, channelSync);
}

function CGTU_VerifyIgt(rangeI, rangeMin, rangeMax, count, verificationCount, resistance, addedResistance)
{
	cgtu_RangeIgt = rangeI;
	cgtu_Imin = rangeMin;
	cgtu_Imax = rangeMax;
	cgtu_Points = count;
	cgtu_Iterations = verificationCount;
	cgtu_Res = resistance;
	cgtu_UseAvg = 0;
	CGTU_Initialize();
	CGTU_VerifyIGate();
	return [cgtu_igt_set, cgtu_igt, cgtu_igt_sc, cgtu_igt_set_err];
}

function CGTU_VerifyVgt(rangeV, rangeMin, rangeMax, count, verificationCount, resistance, addedResistance)
{
	cgtu_RangeVgt = rangeV;
	cgtu_Vmin = rangeMin;
	cgtu_Vmax = rangeMax;
	cgtu_Points = count;
	cgtu_Iterations = verificationCount;
	cgtu_UseAvg = 0;
	CGTU_Initialize();
	CGTU_VerifyVGate();
	return [cgtu_vgt_set, cgtu_vgt, cgtu_vgt_sc, cgtu_vgt_err];
}

function CGTU_VerifyIh(rangeId, rangeMin, rangeMax, count, verificationCount, resistance, addedResistance)
{
	cgtu_Imin = rangeMin;
	cgtu_Imax = rangeMax;
	cgtu_Points = count;
	cgtu_Iterations = verificationCount;
	cgtu_Res = resistance;
	cgtu_UseAvg = 0;
	CGTU_Initialize();
	CGTU_VerifyIPower();
	return [cgtu_id_set, cgtu_id, cgtu_id_sc, cgtu_id_set_err];
}

function CGTU_CalibrateIgt(rangeI, rangeMin, rangeMax, count, verificationCount, resistance, addedResistance)
{
	cgtu_RangeIgt = rangeI;
	cgtu_Imin = rangeMin;
	cgtu_Imax = rangeMax;
	cgtu_Points = count;
	cgtu_Iterations = verificationCount;
	cgtu_Res = resistance;
	cgtu_UseAvg = 0;
	CGTU_Initialize();
	CGTU_CalibrateIGate();
	return [cgtu_igt_set, cgtu_igt, cgtu_igt_sc, cgtu_igt_set_err];
}

function CGTU_CalibrateVgt(rangeV, rangeMin, rangeMax, count, verificationCount, resistance, addedResistance)
{
	cgtu_RangeVgt = rangeV;
	cgtu_Vmin = rangeMin;
	cgtu_Vmax = rangeMax;
	cgtu_Points = count;
	cgtu_Iterations = verificationCount;
	cgtu_UseAvg = 0;
	CGTU_Initialize();
	CGTU_CalibrateVGate();
	return [cgtu_vgt_set, cgtu_vgt, cgtu_vgt_sc, cgtu_vgt_err];
}

function CGTU_CalibrateIh(rangeId, rangeMin, rangeMax, count, verificationCount, resistance, addedResistance)
{
	cgtu_Imin = rangeMin;
	cgtu_Imax = rangeMax;
	cgtu_Points = count;
	cgtu_Iterations = verificationCount;
	cgtu_Res = resistance;
	cgtu_UseAvg = 0;
	CGTU_Initialize();
	CGTU_CalibrateIPower();
	return [cgtu_id_set, cgtu_id, cgtu_id_sc, cgtu_id_set_err];

}

function CGTU_LineResistanceCalc()
{
	var cgtu_dv_sum = 0;
	var cgtu_igt_sum = 0;
	var cgtu_rline = 0;
	
	dev.w(95,0);
	
	// Collect data
	if (CGTU_CollectGate(cgtu_Iterations))
	{
		for (i=0; i<cgtu_vgt.length; i++)
		{
			cgtu_dv_sum += cgtu_vgt[i] - cgtu_vgt_sc[i];
			cgtu_igt_sum += Math.round(cgtu_igt_sc[i]);
		}
		
		cgtu_rline = Math.round(cgtu_dv_sum / cgtu_igt_sum * 1000);
		
		print("Line resistance = " + cgtu_rline + "mOhm")
		
		dev.w(95,cgtu_rline);
		dev.c(200);
	}
}

