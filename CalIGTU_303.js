include("TestIGTU_303.js")
include("DMM6500.js")
include("CalGeneral.js")

// Global definitions

cigtu_Res = 20;	// in Ohms
cigtu_Values = [];
cigtu_min = 1; // in V / in A
cigtu_max = 30; // in V / in A
cigtu_stp = 10; // in V / in A


// Setup parameters for "DMM6000"
CAL_Iges_PulsePlate 	= 5000000 		// in us
CAL_Iges_TriggerDelay	= 2000000 		// in us

CAL_Ugeth_PulsePlate 	= 2000000 		// in us
CAL_Ugeth_TriggerDelay	= 1000000		// in us

CAL_NPLC = 0.02;

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
cigtu_Iterations = 3;

// Calibration types 
cigtu_Cal_Vmes = 0;
cigtu_Cal_Vpotmes = 1;
cigtu_Cal_Vset = 2;
cigtu_Cal_Imes = 3;
cigtu_Cal_Iset = 4;
CalibrationType = cigtu_Cal_Vmes;

// Current Range
cigtu_Cal_Imes_50_500_mA = 1;
cigtu_Cal_Imes_5_50_mA = 2;
cigtu_Cal_Imes_05_5mA = 3;
cigtu_Cal_Imes_50_500mkA = 4;
cigtu_Cal_Imes_2_50mkA = 5;
cigtu_Cal_Imes_200_2000nA = 6;
cigtu_Cal_Imes_20_200nA = 7;
cigtu_Cal_Imes_2_20nA = 8;
CurrentRange = cigtu_Cal_Imes_50_500_mA;

function CIGTU_Init(portDevice)
{
	// Init device port
	dev.Disconnect();
	dev.co(portDevice);

	// DMM6500 init
	KEI_Reset();
}
// Калибровка 
function CIGTU_Calibrate(Calibration_Type, Current_Range)
{
	CalibrationType = Calibration_Type;
	CurrentRange = Current_Range;
	CIGTU_ResetA();
	CIGTU_ResetCal(CalibrationType, CurrentRange);
	if (CIGTU_Collect(cigtu_Iterations, CalibrationType, CurrentRange))
		CIGTU_Save(CIGTU_NameSwitch(CalibrationType, CurrentRange));

	// Plot relative error distribution
	scattern(cigtu_sc, cigtu_err, "Messure", "Error (in %)", CIGTU_NameSwitch(CalibrationType, CurrentRange)); 
	sleep(200);
	scattern(cigtu_sc, cigtu_err_sum, "Messure", "Sum Error (in %)", CIGTU_NameSwitch(CalibrationType, CurrentRange));
	
	// Calculate correction
	cigtu_corr = CGEN_GetCorrection2(CIGTU_NameSwitch(CalibrationType, CurrentRange));
	CIGTU_WriteCal(cigtu_corr, CalibrationType, CurrentRange)

		
	// Print correction
	CIGTU_PrintCoef(CalibrationType, CurrentRange)
}
//--------------------
// Верификация
function CIGTU_Verify(Calibration_Type, Current_Range)
{
	CalibrationType = Calibration_Type;
	CurrentRange = Current_Range;
	CIGTU_ResetA();
	if (CIGTU_Collect(cigtu_Iterations, CalibrationType, CurrentRange))
		CIGTU_Save(CIGTU_NameSwitch(CalibrationType, CurrentRange))

	// Plot relative error distribution
	scattern(cigtu_sc, cigtu_err, "Messure", "Error (in %)", CIGTU_NameSwitch(CalibrationType, CurrentRange)); 
	sleep(200);
	scattern(cigtu_sc, cigtu_err_sum, "Messure", "Sum Error (in %)", CIGTU_NameSwitch(CalibrationType, CurrentRange));
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
	print("Enter resistance set to Ohms ?");
	print("-----------");
	cigtu_Res = parseFloat(readline());
	
	if (isNaN(cigtu_Res))
		cigtu_Res = 1;
	
	cigtu_cntTotal = IterationsCount * cigtu_Values.length;
	cigtu_cntDone = 0;
	
	// Конфигурация DMM6500
	
	CIGTU_KEI_Init(CalibrationType);
	
	// Конфигурация и запуск формирования для IGTU
	for (var i = 0; i < IterationsCount; i++)
	{
		for (var j = 0; j < cigtu_Values.length; j++)
		{
			KEI_ClearBuffer();
			if(CalibrationType == cigtu_Cal_Vmes || CalibrationType == cigtu_Cal_Vpotmes || CalibrationType == cigtu_Cal_Vset) 	
				KEI_SetVoltageDCRange(cigtu_Values[j]);
			else if(CurrentRange == cigtu_Cal_Imes_50_500_mA || CurrentRange == cigtu_Cal_Imes_5_50_mA)	
				KEI_SetCurrentDCRange(cigtu_Values[j]);
			else
				KEI_SetCurrentDCRange(cigtu_Values[j] / cigtu_Res);
			
			KEI_ActivateTrigger();
			dev.w(150,2);
			dev.c(14);	
			sleep(1000);
			dev.w(150,1);
			dev.c(14);
			
			if (CurrentRange == cigtu_Cal_Imes_50_500_mA || CurrentRange == cigtu_Cal_Imes_5_50_mA)
			{ 
				dev.w(151,CurrentRange);
				dev.wf(129, cigtu_Values[j] * 1e3);
				dev.w(92,CAL_Ugeth_PulsePlate * 1e-3);
				dev.c(102);
			}	
			else 
			{
				dev.w(151,CurrentRange);
				dev.wf(128, cigtu_Values[j] * 1e3);
				dev.w(91,CAL_Iges_PulsePlate * 1e-3);
				dev.c(101);
			}	
			while (dev.r(192) != 3) sleep(50);

			KEI_OPC();	
			// Получаем значения
			var scdata = KEI_ReadAverage();
			//sleep(2000);
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
			var errdata = ((igtudata - scdata) / scdata * 100).toFixed(4);
			cigtu_err.push(errdata);
			// Summary error
			if(CalibrationType == cigtu_Cal_Vmes || CalibrationType == cigtu_Cal_Vpotmes || CalibrationType == cigtu_Cal_Vset)
				var E0 = KEI_V_Err(cigtu_Values[j]);
			else
				var E0 = KEI_I_Err(cigtu_Values[j]);
			var err_sumdata = Math.sign_ma(errdata) * (Math.abs(errdata) + E0);
			cigtu_err_sum.push(err_sumdata);
				
				
			print("IGTU: " + igtudata);
			print("DMM6500: " + scdata);
			
			cigtu_cntDone++;
			print("-- result " + cigtu_cntDone + " of " + cigtu_cntTotal + " --");
			
			sleep(1000);
			dev.w(151,0);
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
			return [2, 30, 1];		// [min, max, step] in V

		case cigtu_Cal_Vpotmes:
			return [3, 9, 0.5];		// [min, max, step] in V

		case cigtu_Cal_Vset:
			return [2, 30, 1];		// [min, max, step] in V
			
		case cigtu_Cal_Imes:
			switch(CurrentRange)
			{
				case cigtu_Cal_Imes_50_500_mA:
					return [0.05, 0.3, 0.05];			// [min, max, step] in A 15 Om
				case cigtu_Cal_Imes_5_50_mA:
					return [0.005, 0.05, 0.01];			// [min, max, step] in A 150 Om
				case cigtu_Cal_Imes_05_5mA:
					return [0.0005, 0.005, 0.001];		// [min, max, step] in A
				case cigtu_Cal_Imes_50_500mkA:
					return [1, 10, 3];					// [min, max, step] in mA
				case cigtu_Cal_Imes_2_50mkA:
					return [1, 10, 3];					// [min, max, step] in mA
				case cigtu_Cal_Imes_200_2000nA:
					return [2, 22, 2];					// [min, max, step] in V 10 MOm
				case cigtu_Cal_Imes_20_200nA:
					return [3, 21, 2];					// [min, max, step]	in V 110 MOm
				case cigtu_Cal_Imes_2_20nA:
					return [5.5, 20, 1];					// [min, max, step]	in V 1 GOm
				default:
					return [];
			}

		case cigtu_Cal_Iset:
			switch(CurrentRange)
			{
				case cigtu_Cal_Imes_50_500_mA:
					return [0.05, 0.3, 0.05];			// [min, max, step] in A 15 Om
				case cigtu_Cal_Imes_5_50_mA:
					return [0.005, 0.05, 0.01];			// [min, max, step] in A 150 Om
				default:
					return [];
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
				case cigtu_Cal_Imes_50_500_mA:
					return [[11, 12, 13]];	// [P2, P1, P0]
				case cigtu_Cal_Imes_5_50_mA:
					return [[17, 18, 19]];	// [P2, P1, P0]
				case cigtu_Cal_Imes_05_5mA:
					return [[23, 24, 25]];	// [P2, P1, P0]
				case cigtu_Cal_Imes_50_500mkA:
					return [[29, 30, 31]];	// [P2, P1, P0]
				case cigtu_Cal_Imes_2_50mkA:
					return [[35, 36, 37]];	// [P2, P1, P0]	
				case cigtu_Cal_Imes_200_2000nA:
					return [[41, 42, 43]];	// [P2, P1, P0]
				case cigtu_Cal_Imes_20_200nA:
					return [[47, 48, 49]];	// [P2, P1, P0]	
				case cigtu_Cal_Imes_2_20nA:
					return [[53, 54, 55]];	// [P2, P1, P0]		
				default:
					return [[11, 12, 13]];	// [P2, P1, P0]
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
function CIGTU_WriteCal(Data, CalibrationType, CurrentRange)
{
	var RegList = CIGTU_GetCoefReg(CalibrationType, CurrentRange);
	
	for (var i = 0; i < RegList.length; i++)
		CIGTU_SetCoef(RegList[i], Data);
}
//--------------------
//
function CIGTU_KEI_Init(CalibrationType)
{
	if(CalibrationType == cigtu_Cal_Vmes || CalibrationType == cigtu_Cal_Vpotmes || CalibrationType == cigtu_Cal_Vset) 	
	{
		KEI_ConfigVoltageDC(CAL_NPLC, 'OFF');
		KEI_FilterConfig('VOLT' , 1, 'MOV', 10);
	}
	else
	{
		KEI_ConfigCurrentDC(CAL_NPLC, "ON");
		KEI_FilterConfig('CURR' , 1, 'MOV', 100);	
	}

	if(CurrentRange == cigtu_Cal_Imes_50_500_mA || CurrentRange == cigtu_Cal_Imes_5_50_mA)
	{
		KEI_MakeTestBufferVoltageDC(CAL_NPLC, (CAL_Ugeth_PulsePlate - CAL_Ugeth_TriggerDelay));
		KEI_ConfigExtTrigger(CAL_Ugeth_TriggerDelay * 1e-6);
	}
	else
	{
		KEI_MakeTestBufferVoltageDC(CAL_NPLC, (CAL_Iges_PulsePlate * 0.6 - CAL_Iges_TriggerDelay));
		KEI_ConfigExtTrigger(CAL_Iges_TriggerDelay * 1e-6);
	}
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
				case cigtu_Cal_Imes_50_500_mA:
					return "cigtu_Cal_Imes_50_500_mA" 
				case cigtu_Cal_Imes_5_50_mA:
					return "cigtu_Cal_Imes_5_50_mA"
				case cigtu_Cal_Imes_05_5mA:
					return "cigtu_Cal_Imes_0.5_5mA"
				case cigtu_Cal_Imes_50_500mkA:
					return "cigtu_Cal_Imes_50_500mkA"
				case cigtu_Cal_Imes_2_50mkA:
					return "cigtu_Cal_Imes_2_50mkA"	
				case cigtu_Cal_Imes_200_2000nA:
					return "cigtu_Cal_Imes_200_2000nA"
				case cigtu_Cal_Imes_20_200nA:
					return "cigtu_Cal_Imes_20_200nA"
				case cigtu_Cal_Imes_2_20nA:
					return "cigtu_Cal_Imes_2_20nA"	
				default:
					return 0
			}
			
		case cigtu_Cal_Iset:
			switch(CurrentRange)
			{
				case cigtu_Cal_Imes_50_500_mA:
					return "cigtu_Cal_Imes_50_500_mA" 
				case cigtu_Cal_Imes_5_50_mA:
					return "cigtu_Cal_Imes_5_50_mA"
				default:
					return 0
			}
	}
	
	return 0;
}

function CAL_V_DMM6500_Err(Voltage)
{
	if(Voltage <= 0.1)
		var Err_DMM = ((3 * Math.pow(10, -5) * Voltage + 3.5 * Math.pow(10, -5) * 0.1) / Voltage) * 100;

	if(Voltage > 0.1 && Voltage <= 1)
		var Err_DMM = ((2.5 * Math.pow(10, -5) * Voltage + 6 * Math.pow(10, -5) * 1) / Voltage) * 100;

	if(Voltage > 1 && Voltage <= 10)
		var Err_DMM = ((2.5 * Math.pow(10, -5) * Voltage + 5 * Math.pow(10, -6) * 10) / Voltage) * 100;

	if(Voltage > 10)
		var Err_DMM = ((4 * Math.pow(10, -5) * Voltage + 6 * Math.pow(10, -6) * 100) / Voltage) * 100;

	return Err_DMM;
}

function CAL_I_DMM6500_Err(Current)
{
	if(Current <= 0.00001)
		var Err_DMM = ((4.5 * Math.pow(10, -4) * Current + 5 * Math.pow(10, -5) * 0.00001) / Current) * 100;

	if(Current > 0.00001 && Current <= 0.0001)
		var Err_DMM = ((4.5 * Math.pow(10, -4) * Current + 5 * Math.pow(10, -5) * 0.0001) / Current) * 100;

	if(Current > 0.0001 && Current <= 0.001)
		var Err_DMM = ((4.5 * Math.pow(10, -4) * Current + 5 * Math.pow(10, -5) * 0.001) / Current) * 100;

	if(Current > 0.001 && Current <= 0.01)
		var Err_DMM = ((2 * Math.pow(10, -4) * Current + 5 * Math.pow(10, -5) * 0.01) / Current) * 100;
	
	if(Current > 0.01 && Current <= 0.1)
		var Err_DMM = ((2 * Math.pow(10, -4) * Current + 5 * Math.pow(10, -5) * 0.1) / Current) * 100;

	if(Current > 0.1 && Current <= 1)
		var Err_DMM = ((4 * Math.pow(10, -4) * Current + 5 * Math.pow(10, -5) * 1) / Current) * 100;

	if(Current > 1 && Current <= 3)
		var Err_DMM = ((5 * Math.pow(10, -4) * Current + 5 * Math.pow(10, -5) * 3) / Current) * 100;

	if(Current > 3)
		var Err_DMM = ((2.2 * Math.pow(10, -3) * Current + 2.5 * Math.pow(10, -4) * 10) / Current) * 100;

	return Err_DMM;
}