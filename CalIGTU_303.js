include("TestIGTU_303.js")
include("DMM6500.js")
include("CalGeneral.js")

// Global definitions

cigtu_Res = 10;	// in Ohms
cigtu_Values = [];

// Value limits
cigtu_min = 1; // in V / in A
cigtu_max = 30; // in V / in A
cigtu_stp = 10; // in V / in A


// Setup parameters for "DMM6000"
CAL_V_PulsePlate 	= 20000 		// in us
CAL_V_TriggerDelay	= 0.01			// in s
CAL_NPLC = 0.0005;

// Counters
cigtu_cntTotal = 0;
cigtu_cntDone = 0;

// Results storage
cigtu = [];

// Tektronix data
cigtu_sc = [];

// Relative error
cigtu_err = [];

// Summary error
cigtu_err_sum = [];

// Correction
cigtu_corr = [];

// Iterations
cigtu_Iterations = 1;

// Measurement errors
EUosc = 3;
ER = 1;
E0 = 0;

// Calibration types
CalibrationType = cigtu_Cal_Vmes; 
cigtu_Cal_Vmes = 0;
cigtu_Cal_Vpotmes = 1;
cigtu_Cal_Vset = 2;
cigtu_Cal_Imes = 3;
cigtu_Cal_Iset = 4;

CurrentRange = 0;

function CIGTU_Init(portDevice)
{
	// Init device port
	dev.Disconnect();
	dev.co(portDevice);

	// DMM6500 init
	KEI_Reset();
}
// Калибровка 
function CIGTU_Calibrate(CalibrationType, CurrentRange)
{
	CalibrationType = CalibrationType;
	CurrentRange = CurrentRange;
	CIGTU_ResetA();
	CIGTU_ResetCal(cigtu_Cal_Vset);
	if (CIGTU_Collect(cigtu_Iterations, CalibrationType, CurrentRange))
		CIGTU_Save(CIGTU_NameSwitch(CalibrationType, CurrentRange))

	// Plot relative error distribution
	scattern(cigtu_sc, cigtu_err, "Messure", "Error (in %)", CIGTU_NameSwitch(CalibrationType, CurrentRange)); sleep(200);
	scattern(cigtu_sc, cigtu_err_sum, "Mesure", "Error (in %)", CIGTU_NameSwitch(CalibrationType, CurrentRange));
	
	// Calculate correction
	cigtu_corr = CGEN_GetCorrection2(CIGTU_NameSwitch(CalibrationType, CurrentRange));
	CIGTU_WriteCal(cigtu_corr, CalibrationType, CurrentRange)

		
	// Print correction
	CIGTU_PrintCoef(CalibrationType, CurrentRange)
}
//--------------------
// Верификация
function CIGTU_Verify(CalibrationType, CurrentRange)
{
	CIGTU_ResetA();

	// Plot relative error distribution
	scattern(cigtu_sc, cigtu_err, "Messure", "Error (in %)", CIGTU_NameSwitch(CalibrationType, CurrentRange)); sleep(200);
	scattern(cigtu_sc, cigtu_err_sum, "Mesure", "Error (in %)", CIGTU_NameSwitch(CalibrationType, CurrentRange));
}
//--------------------
// Сбор данных 
function CIGTU_Collect(IterationsCount, CalibrationType, CurrentRange)
{
	// Находим диапазон 
	var Range = CIGTU_GetRange(CalibrationType, CurrentRange);
	cigtu_min = Range[0];
	cigtu_max = Range[1];
	cigtu_stp = Range[2];
	cigtu_Values = CGEN_GetRange(cigtu_min, cigtu_max, cigtu_stp);
	
	// Спрашиваем о корректности подключения к СИ
	if(CalibrationType == cigtu_Cal_Imes || CalibrationType == cigtu_Cal_Iset)
		connector = "white"
	else
		connector = "red"
	print("Connect in " + connector + " connector?")
	print("-----------");
	print("(press 'y' or 'n')")
	do
	{
		key = readkey();
		if (key == "y")
			break;
		else if (key == "n")
			return;
	}
	while (true)

	// Спрашиваем о корректности подключения нагрузки
	print("Power resistance set to " + cigtu_Res + " Ohms ?");
	print("-----------");
	print("(press 'y' or 'n')")
	do
	{
		key = readkey();
		if (key == "y")
			break;
		else if (key == "n")
			return;
	}
	while (true)
	
	cigtu_cntTotal = IterationsCount * cigtu_Values.length;
	cigtu_cntDone = 0;
	
	// Конфигурация DMM6500
	
	CIGTU_KEI_Init();
	
	// Конфигурация и запуск формирования для IGTU
	for (var i = 0; i < IterationsCount; i++)
	{
		for (var j = 0; j < cigtu_Values.length; j++)
		{
		KEI_ClearBuffer();
		KEI_SetVoltageDCRange(cigtu_Values[j]);
		KEI_ActivateTrigger();	
		sleep(1000);
			if(CalibrationType == cigtu_Cal_Vmes || CalibrationType == cigtu_Cal_Vpotmes || CalibrationType == cigtu_Cal_Vset) 	
			{
				dev.wf(128, cigtu_Values[j] * 10e2);
				dev.c(101);
			}
			else 
			{
				dev.wf(129, cigtu_Values[j]);
				dev.c(102);
			}	
			while (dev.r(192) != 3) sleep(50);

			sleep(2000);
				
			// Получаем значения
			var scdata = KEI_ReadAverage();
			if(CalibrationType == cigtu_Cal_Vset || CalibrationType == cigtu_Cal_Iset) 
				var igtudata = cigtu_Values[j];
			else if(CalibrationType == cigtu_Cal_Vmes) 	
				var igtudata = dev.rf(231);	
			else if (CalibrationType == cigtu_Cal_Vpotmes)
				var igtudata = dev.rf(232);
			else
				var igtudata = dev.rf(230);


			// gtu data
			cigtu.push(igtudata);
			// DMM6500 data
			cigtu_sc.push(scdata);
			// relative error
			cigtu_err.push(((igtudata - scdata) / scdata * 100).toFixed(2))
			// Summary error
			E0 = Math.sqrt(Math.pow(EUosc, 2) + Math.pow(ER, 2));
			cigtu_err_sum.push(1.1 * Math.sqrt(Math.pow((igtudata - scdata) / scdata * 100, 2) + Math.pow(E0, 2)));
				
				
			print("IGTU: " + igtudata.toFixed(4));
			print("DMM6500: " + scdata);
			
			cigtu_cntDone++;
			print("-- result " + cigtu_cntDone + " of " + cigtu_cntTotal + " --");
			
			sleep(1000);
		}
			
		if (anykey()) return 0;
	}
		
	return 1;
}
//--------------------
// 
function CIGTU_ResetA()
{
// Results storage
cigtu = [];

// Tektronix data
cigtu_sc = [];

// Relative error
cigtu_err = [];

// Summary error
cigtu_err_sum = [];

// Correction
cigtu_corr = [];
}
//--------------------
//
function CIGTU_GetRange(CalibrationType, CurrentRange)
{
	switch(CalibrationType)
	{
		case cigtu_Cal_Vmes:
			return [1, 30, 10];		// [min, max, step]

		case cigtu_Cal_Vpotmes:
			return [3, 9, 3];		// [min, max, step]

		case cigtu_Cal_Vset:
			return [1, 30, 10];		// [min, max, step]
			
		case cigtu_Cal_Imes:
			switch(CurrentRange)
			{
				case 0:
					return [11, 12, 13];	// [min, max, step]
				case 1:
					return [17, 18, 19];	// [min, max, step]
				case 2:
					return [23, 24, 25];	// [min, max, step]
				case 3:
					return [29, 30, 31];	// [min, max, step]
				case 4:
					return [35, 36, 37];	// [min, max, step]
				case 5:
					return [41, 42, 43];	// [min, max, step]
				case 6:
					return [47, 48, 49];	// [min, max, step]	
				case 7:
					return [53, 54, 55];	// [min, max, step]	
				default:
					return [11, 12, 13];	// [min, max, step]
			}
			
		case cigtu_Cal_Iset:
			switch(CurrentRange)
			{
				case 1:
					return [46, 47, 48];	// [min, max, step]
				default:
					return [25, 26, 27];	// [min, max, step]
			}
	}
	
	return [];
}
//--------------------
//
function CIGTU_GetCoefReg(CalibrationType, CurrentRange)
{
	switch(CalibrationType)
	{
		case cigtu_Cal_Vmes:
			return [[1, 2, 3]];			// [P2, P1, P0]
			
		case cigtu_Cal_Vpotmes:
			return [[6, 7, 8]];			// [P2, P1, P0]
			
		case cigtu_Cal_Vset:
			return [[61, 62, 63]];		// [P2, P1, P0]
			
		case cigtu_Cal_Imes:
			switch(CurrentRange)
			{
				case 0:
					return [[11, 12, 13]];	// [P2, P1, P0]
				case 1:
					return [[17, 18, 19]];	// [P2, P1, P0]
				case 2:
					return [[23, 24, 25]];	// [P2, P1, P0]
				case 3:
					return [[29, 30, 31]];	// [P2, P1, P0]
				case 4:
					return [[35, 36, 37]];	// [P2, P1, P0]	
				case 5:
					return [[41, 42, 43]];	// [P2, P1, P0]
				case 6:
					return [[47, 48, 49]];	// [P2, P1, P0]	
				case 7:
					return [[53, 54, 55]];	// [P2, P1, P0]		
				default:
					return [[11, 12, 13]];	// [P2, P1, P0]
			}
			
		case cigtu_Cal_Iset:
			switch(CurrentRange)
			{
				case 1:
					return [[46, 47, 48]];	// [P2, P1, P0]
				default:
					return [[25, 26, 27]];	// [P2, P1, P0]
			}
	}
	
	return [];
}
//--------------------
//
function CIGTU_SetCoef(Reg, Data)
{
	dev.wf(Reg[0], Data[0]);
	dev.wf(Reg[1], Data[1]);
	dev.wf(Reg[2], Data[2]);
}
//--------------------
//
function CIGTU_ResetCal(CalibrationType, CurrentRange)
{
	var RegList = CIGTU_GetCoefReg(CalibrationType, CurrentRange);
	var Data = [0, 1, 0];
	
	for (var i = 0; i < RegList.length; i++)
		CIGTU_SetCoef(RegList[i], Data);
}
//--------------------
//
function CIGTU_PrintCoef(CalibrationType, CurrentRange)
{
	var RegList = CIGTU_GetCoefReg(CalibrationType, CurrentRange);
	
	for (var i = 0; i < RegList.length; i++)
	{
		print("P2 (reg " + RegList[i][0] + "): " + dev.rf(RegList[i][0]));
		print("P1 (reg " + RegList[i][1] + "): " + dev.rf(RegList[i][1]));
		print("P0 (reg " + RegList[i][2] + "): " + dev.rf(RegList[i][2]));
	}
}
//--------------------
//
function CIGTU_Save(Name)
{
	CGEN_SaveArrays(Name, cigtu, cigtu_sc, cigtu_err, cigtu_err_sum);
}
//--------------------
//
function CIGTU_WriteCal(Data,CalibrationType, CurrentRange)
{
	var RegList = CIGTU_GetCoefReg(CalibrationType, CurrentRange);
	
	for (var i = 0; i < RegList.length; i++)
		CIGTU_SetCoef(RegList[i], Data);
}
//--------------------
//
function CIGTU_KEI_Init()
{
	KEI_ConfigVoltageDC(CAL_NPLC);
	KEI_MakeTestBufferVoltageDC(CAL_NPLC, CAL_V_PulsePlate);
	KEI_ConfigExtTrigger(CAL_V_TriggerDelay);
}
//--------------------
//
function CIGTU_NameSwitch(CalibrationType, CurrentRange) 
{
 switch(CalibrationType)
	{
		case cigtu_Cal_Vmes:
			return "cigtu_Cal_Vmes";
			
		case cigtu_Cal_Vpotmes:
			return "cigtu_Cal_Vpotmes";			
			
		case cigtu_Cal_Vset:
			return "cigtu_Cal_Vset";	
			
		case cigtu_Cal_Imes:
			switch(CurrentRange)
			{
				case 0:
					return "cigtu_Cal_Imes_50_500_mA" 
				case 1:
					return "cigtu_Cal_Imes_5_50_mA"
				case 2:
					return "cigtu_Cal_Imes_0.5_5mA"
				case 3:
					return "cigtu_Cal_Imes_50_500mkA"
				case 4:
					return "cigtu_Cal_Imes_2_50mkA"	
				case 5:
					return "cigtu_Cal_Imes_200_2000nA"
				case 6:
					return "cigtu_Cal_Imes_20_200nA "
				case 7:
					return "cigtu_Cal_Imes_2_20nA "	
				default:
					return 0
			}
			
		case cigtu_Cal_Iset:
			switch(CurrentRange)
			{
				case 1:
					return "cigtu_Cal_Iset"
				default:
					return 0
			}
	}
	
	return 0;
}
/*
function CGTU_CalibrateGate()
{
	// Collect data
	CGTU_ResetA();
	CGTU_ResetGateCal();
	if (CGTU_CollectGate(cgtu_Iterations))
	{
		CGTU_SaveGate("gtu_igt", "gtu_vgt");
		
		// Plot relative error distribution
		scattern(cgtu_igt_sc, cgtu_igt_err, "Igt (in mA)", "Error (in %)", "Igt relative error"); sleep(200);
		scattern(cgtu_vgt_sc, cgtu_vgt_err, "Vgt (in mV)", "Error (in %)", "Vgt relative error");
		
		if (CGEN_UseQuadraticCorrection())
		{
			// Calculate correction
			cgtu_igt_corr = CGEN_GetCorrection2("gtu_igt");
			CGTU_CalIGT2(cgtu_igt_corr[0], cgtu_igt_corr[1], cgtu_igt_corr[2]);
			
			cgtu_vgt_corr = CGEN_GetCorrection2("gtu_vgt");
			CGTU_CalVGT2(cgtu_vgt_corr[0], cgtu_vgt_corr[1], cgtu_vgt_corr[2]);
		}
		else
		{
			// Calculate correction
			cgtu_igt_corr = CGEN_GetCorrection("gtu_igt");
			CGTU_CalIGT(cgtu_igt_corr[0], cgtu_igt_corr[1]);
			
			cgtu_vgt_corr = CGEN_GetCorrection("gtu_vgt");
			CGTU_CalVGT(cgtu_vgt_corr[0], cgtu_vgt_corr[1]);
		}
		
		// Print correction
		CGTU_PrintGateCal();
	}
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

function CGTU_CalibratePower()
{
	// Collect data
	CGTU_ResetA();
	CGTU_ResetPowerCal();
	if (CGTU_CollectPower(cgtu_Iterations))
	{
		CGTU_SavePower("gtu_ih");
		
		// Plot relative error distribution
		scattern(cgtu_ih_sc, cgtu_ih_err, "Ih (in mA)", "Error (in %)", "Ih relative error");
		
		if (CGEN_UseQuadraticCorrection())
		{
			// Calculate correction
			cgtu_ih_corr = CGEN_GetCorrection2("gtu_ih");
			CGTU_CalIH2(cgtu_ih_corr[0], cgtu_ih_corr[1], cgtu_ih_corr[2]);
		}
		else
		{
			// Calculate correction
			cgtu_ih_corr = CGEN_GetCorrection("gtu_ih");
			CGTU_CalIH(cgtu_ih_corr[0], cgtu_ih_corr[1]);
		}
		
		// Print correction
		CGTU_PrintPowerCal();
	}
}

function CGTU_VerifyGate()
{
	// Collect corrected data
	CGTU_ResetA();
	if (CGTU_CollectGate(cgtu_Iterations))
	{
		CGTU_SaveGate("gtu_igt_fixed", "gtu_vgt_fixed");
		
		// Plot relative error distribution
		scattern(cgtu_igt_sc, cgtu_igt_err, "Igt (in mA)", "Error (in %)", "Igt relative error"); sleep(200);
		scattern(cgtu_vgt_sc, cgtu_vgt_err, "Vgt (in mV)", "Error (in %)", "Vgt relative error"); sleep(200);
		
		// Plot summary error distribution
		scattern(cgtu_igt_sc, cgtu_igt_err_sum, "Igt (in mA)", "Error (in %)", "Igt summary error"); sleep(200);
		scattern(cgtu_vgt_sc, cgtu_vgt_err_sum, "Vgt (in mV)", "Error (in %)", "Vgt summary error");
	}
}

function CGTU_VerifyPower()
{
	// Collect corrected data
	CGTU_ResetA();
	if (CGTU_CollectPower(cgtu_Iterations))
	{
		CGTU_SavePower("gtu_ih_fixed");
		
		// Plot relative error distribution
		scattern(cgtu_ih_sc, cgtu_ih_err, "Ih (in mA)", "Error (in %)", "Ih relative error");
		scattern(cgtu_ih_sc, cgtu_ih_err_sum, "Ih (in mA)", "Error (in %)", "Ih summary error");
	}
}

function CGTU_CollectGate(IterationsCount)
{
	cgtu_CurrentValues = CGEN_GetRange(cgtu_Imin, cgtu_Imax, cgtu_Istp);

	print("Gate resistance set to " + cgtu_ResGate + " Ohms");
	print("-----------");
	return CGTU_Collect(110, cgtu_ResGate, cgtu_CurrentValues, IterationsCount);
}

function CGTU_CollectPower(IterationsCount)
{
	cgtu_CurrentValues = CGEN_GetRange(cgtu_Imin, cgtu_Imax, cgtu_Istp);

	print("Power resistance set to " + cgtu_ResPower + " Ohms");
	print("-----------");
	return CGTU_Collect(111, cgtu_ResPower, cgtu_CurrentValues, IterationsCount);
}

function CGTU_Collect(ProbeCMD, Resistance, cgtu_CurrentValues, IterationsCount)
{	
	cgtu_cntTotal = IterationsCount * cgtu_CurrentValues.length;
	cgtu_cntDone = 0;
	
	// Init trigger
	TEK_TriggerPulseInit((ProbeCMD == 110) ? cgtu_chMeasureGate : cgtu_chMeasurePower, "1");
	CGTU_TriggerTune();
	
	// Configure scale
	CGTU_TekScale((ProbeCMD == 110) ? cgtu_chMeasureGate : cgtu_chMeasurePower, cgtu_Imax * Resistance / 1000);
	sleep(500);
	
	for (var i = 0; i < IterationsCount; i++)
	{
		for (var j = 0; j < cgtu_CurrentValues.length; j++)
		{
			if (cgtu_UseRangeTuning)
				CGTU_TekScale((ProbeCMD == 110) ? cgtu_chMeasureGate : cgtu_chMeasurePower, cgtu_CurrentValues[j] * Resistance / 1000);
			
			// Configure trigger
			TEK_TriggerLevelF(cgtu_CurrentValues[j] * Resistance / (1000 * 2));
			sleep(1000);
			
			// Configure GTU
			dev.w(140, cgtu_CurrentValues[j]);
			CGTU_Probe(ProbeCMD);
			
			if (anykey()) return 0;
		}
	}
	
	return 1;
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
	
	for (var i = 0; i < (cgtu_UseAvg ? (AvgNum + 1) : 1); i++)
	{
		dev.c(ProbeCMD);
		while (dev.r(192) != 0) sleep(50);
		sleep(500);
	}
	
	sleep(1000);
	
	var f = CGTU_Measure((ProbeCMD == 110) ? cgtu_chMeasureGate : cgtu_chMeasurePower);
	
	if (ProbeCMD == 110)
	{
		var igt = dev.r(204);
		var vgt = dev.r(205);
		var igt_sc = (f / cgtu_ResGate).toFixed(1);
		var vgt_sc = f;
		
		// gtu data
		cgtu_igt.push(igt);
		cgtu_vgt.push(vgt);
		// tektronix data
		cgtu_igt_sc.push(igt_sc);
		cgtu_vgt_sc.push(vgt_sc);
		// relative error
		cgtu_igt_err.push(((igt - igt_sc) / igt_sc * 100).toFixed(2))
		cgtu_vgt_err.push(((vgt - vgt_sc) / vgt_sc * 100).toFixed(2))
		// Summary error
		E0 = Math.sqrt(Math.pow(EUosc, 2) + Math.pow(ER, 2));
		cgtu_igt_err_sum.push(1.1 * Math.sqrt(Math.pow((igt - igt_sc) / igt_sc * 100, 2) + Math.pow(E0, 2)));
		cgtu_vgt_err_sum.push(1.1 * Math.sqrt(Math.pow((vgt - vgt_sc) / vgt_sc * 100, 2) + Math.pow(E0, 2)));
	}
	else
	{
		var ih = dev.r(204);
		var ih_sc = (f / cgtu_ResPower).toFixed(1);		
		
		cgtu_ih.push(ih);
		cgtu_ih_sc.push(ih_sc);
		cgtu_ih_err.push(((ih_sc - ih) / ih_sc * 100).toFixed(2));
		
		// Summary error
		E0 = Math.sqrt(Math.pow(EUosc, 2) + Math.pow(ER, 2));
		cgtu_ih_err_sum.push(1.1 * Math.sqrt(Math.pow(((ih_sc - ih) / ih_sc).toFixed(2) * 100, 2) + Math.pow(E0, 2)));
	}
	
	print("Iset, mA: " + dev.r(140));
	if (ProbeCMD == 110)
	{
		print("Igt,  mA: " + dev.r(204));
		print("Vgt,  mV: " + dev.r(205));
	}
	else
		print("Ih,   mA: " + dev.r(204));
	print("Tek,  mV: " + f);
	
	cgtu_cntDone++;
	print("-- result " + cgtu_cntDone + " of " + cgtu_cntTotal + " --");
	
	sleep(500);
}

function CGTU_Init(portGate, portTek, channelMeasureGate, channelMeasurePower)
{
	if (channelMeasureGate < 1 || channelMeasureGate > 4 ||
		channelMeasurePower < 1 || channelMeasurePower > 4)
	{
		print("Wrong channel numbers");
		return;
	}
	
	// Copy channel information
	cgtu_chMeasureGate = channelMeasureGate;
	cgtu_chMeasurePower = channelMeasurePower;
	
	// Init GTU
	dev.Disconnect();
	dev.Connect(portGate);
	
	// Init Tektronix
	TEK_PortInit(portTek);
	
	// Tektronix init
	// Init channels
	TEK_ChannelInit(cgtu_chMeasureGate, "1", "1");
	TEK_ChannelInit(cgtu_chMeasurePower, "1", "1");
	// Init trigger
	TEK_TriggerPulseInit(cgtu_chMeasureGate, "1");
	CGTU_TriggerTune();
	// Horizontal settings
	TEK_Horizontal("10e-3", "-40e-3");
	
	// Display channels
	for (var i = 1; i <= 4; i++)
	{
		if (i == cgtu_chMeasureGate || i == cgtu_chMeasurePower)
			TEK_ChannelOn(i);
		else
			TEK_ChannelOff(i);
	}
	
	// Init measurement
	CGTU_TekCursor(cgtu_chMeasureGate);
	CGTU_TekCursor(cgtu_chMeasurePower);
}

function CGTU_TriggerTune()
{
	TEK_Send("trigger:main:pulse:width:polarity negative");
	TEK_Send("trigger:main:pulse:width:width 50e-3");
}

function CGTU_TekCursor(Channel)
{
	TEK_Send("cursor:select:source ch" + Channel);
	TEK_Send("cursor:function vbars");
	TEK_Send("cursor:vbars:position1 -60e-3");
	TEK_Send("cursor:vbars:position2 0");
}

function CGTU_TekScale(Channel, Value)
{
	TEK_ChannelScale(Channel, Value);
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



function CGTU_SaveGate(NameIGT, NameVGT)
{
	CGEN_SaveArrays(NameIGT, cgtu_igt, cgtu_igt_sc, cgtu_igt_err, cgtu_igt_err_sum);	
	CGEN_SaveArrays(NameVGT, cgtu_vgt, cgtu_vgt_sc, cgtu_vgt_err, cgtu_vgt_err_sum);
}

function CGTU_SavePower(NameIH)
{
	CGEN_SaveArrays(NameIH, cgtu_ih, cgtu_ih_sc, cgtu_ih_err, cgtu_ih_err_sum);
}

function CGTU_CalIGT(K, Offset)
{
	dev.w(50, Math.round(K * 1000));
	dev.w(51, 1000);
	dev.ws(57, Math.round(Offset));
}

function CGTU_CalIGT2(P2, P1, P0)
{
	dev.ws(50, Math.round(P2 * 1e6));
	dev.w(51, Math.round(P1 * 1000));
	dev.ws(57, Math.round(P0));
}

function CGTU_CalVGT(K, Offset)
{
	dev.w(52, Math.round(K * 1000));
	dev.w(53, 1000);
	dev.ws(56, Math.round(Offset));
}

function CGTU_CalVGT2(P2, P1, P0)
{
	dev.ws(52, Math.round(P2 * 1e6));
	dev.w(53, Math.round(P1 * 1000));
	dev.ws(56, Math.round(P0));
}

function CGTU_CalIH(K, Offset)
{
	dev.w(33, Math.round(K * 1000));
	dev.w(34, 1000);
	dev.ws(35, Math.round(Offset));
}

function CGTU_CalIH2(P2, P1, P0)
{
	dev.ws(33, Math.round(P2 * 1e6));
	dev.w(34, Math.round(P1 * 1000));
	dev.ws(35, Math.round(P0));
}

function CGTU_PrintGateCal()
{
	if (CGEN_UseQuadraticCorrection())
	{
		print("IGT P2 x1e6:	" + dev.rs(50));
		print("IGT P1 x1000:	" + dev.r(51));
		print("IGT P0:		" + dev.rs(57));
		
		print("VGT P2 x1e6:	" + dev.rs(52));
		print("VGT P1 x1000:	" + dev.r(53));
		print("VGT P0:		" + dev.rs(56));
	}
	else
	{
		print("IGT K:		" + (dev.r(50) / dev.r(51)));
		print("IGT Offset:	" + dev.rs(57));
		print("VGT K:		" + (dev.r(52) / dev.r(53)));
		print("VGT Offset:	" + dev.rs(56));
	}
}

function CGTU_PrintPowerCal()
{
	if (CGEN_UseQuadraticCorrection())
	{
		print("IH  P2 x1e6:	" + dev.rs(33));
		print("IH  P1 x1000:	" + dev.r(34));
		print("IH  P0:		" + dev.rs(35));
	}
	else
	{
		print("IH  K:		" + (dev.r(33) / dev.r(34)));
		print("IH  Offset:	" + dev.rs(35));
	}
}

function CGTU_ResetGateCal()
{
	if (CGEN_UseQuadraticCorrection())
	{
		CGTU_CalIGT2(0, 1, 0);
		CGTU_CalVGT2(0, 1, 0);
	}
	else
	{
		CGTU_CalIGT(1, 0);
		CGTU_CalVGT(1, 0);
	}
	
	dev.w(95, 0);
}

function CGTU_ResetPowerCal()
{
	if (CGEN_UseQuadraticCorrection())
		CGTU_CalIH2(0, 1, 0);
	else
		CGTU_CalIH(1, 0);
}
*/