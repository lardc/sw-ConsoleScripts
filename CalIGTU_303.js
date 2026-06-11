include("TestIGTU_303.js")
include("DMM6500.js")
include("CalGeneral.js")

// Global definitions

cigtu_Res = 20;	// in Ohms
cigtu_Values = [];

// Value limits
cigtu_min = 1; // in V / in A
cigtu_max = 30; // in V / in A
cigtu_stp = 10; // in V / in A


// Setup parameters for "DMM6000"
CAL_V_PulsePlate 	= 300000 		// in us
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
cigtu_Cal_Vmes = 0;
cigtu_Cal_Vpotmes = 1;
cigtu_Cal_Vset = 2;
cigtu_Cal_Imes = 3;
cigtu_Cal_Iset = 4;
CalibrationType = cigtu_Cal_Vmes;

// Current Range
cigtu_Cal_Imes_50_500_mA = 10;
cigtu_Cal_Imes_5_50_mA = 11;
cigtu_Cal_Imes_05_5mA = 12;
cigtu_Cal_Imes_50_500mkA = 13;
cigtu_Cal_Imes_2_50mkA = 14;
cigtu_Cal_Imes_200_2000nA = 15;
cigtu_Cal_Imes_20_200nA = 16;
cigtu_Cal_Imes_2_20nA = 17;
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
function CIGTU_Calibrate(CalibrationType, CurrentRange)
{
	CalibrationType = CalibrationType;
	//CurrentRange = CurrentRange;
	//CIGTU_ResetA();
	//CIGTU_ResetCal(CalibrationType, CurrentRange);
	if (CIGTU_Collect(cigtu_Iterations, CalibrationType, CurrentRange))
		CIGTU_Save(CIGTU_NameSwitch(CalibrationType, CurrentRange));

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
	if (CIGTU_Collect(cigtu_Iterations, CalibrationType, CurrentRange))
		CIGTU_Save(CIGTU_NameSwitch(CalibrationType, CurrentRange))

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
	
	CIGTU_KEI_Init(CalibrationType);
	
	// Конфигурация и запуск формирования для IGTU
	for (var i = 0; i < IterationsCount; i++)
	{
		for (var j = 0; j < cigtu_Values.length; j++)
		{
		KEI_ClearBuffer();
		if(CalibrationType == cigtu_Cal_Vmes || CalibrationType == cigtu_Cal_Vpotmes || CalibrationType == cigtu_Cal_Vset) 	
			KEI_SetVoltageDCRange(cigtu_Values[j]);
		else
			KEI_SetCurrentDCRange(cigtu_Values[j]);
		
		KEI_ActivateTrigger();	
		sleep(1000);
		
			if(CalibrationType == cigtu_Cal_Iset) 	
			{
				dev.wf(129, cigtu_Values[j] * 10e2);
				dev.w(86,CAL_V_PulsePlate * 10e-4)
				dev.c(102);
			}
			else if (CalibrationType == cigtu_Cal_Imes && (CurrentRange == cigtu_Cal_Imes_50_500_mA || CurrentRange == cigtu_Cal_Imes_5_50_mA)) 
			{ 
				dev.wf(129, cigtu_Values[j]* 10e2);
			dev.w(86,CAL_V_PulsePlate * 10e-4)
				dev.c(102);
			}	
			else 
			{
				dev.wf(128, cigtu_Values[j] * 10e2);
				dev.w(91,CAL_V_PulsePlate * 10e-4)
				dev.c(101);
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
				
				
			print("IGTU: " + igtudata);
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
			return [1, 30, 2];		// [min, max, step] in V

		case cigtu_Cal_Vpotmes:
			return [3, 9, 1];		// [min, max, step] in V

		case cigtu_Cal_Vset:
			return [1, 30, 2];		// [min, max, step] in V
			
		case cigtu_Cal_Imes:
			switch(CurrentRange)
			{
				case cigtu_Cal_Imes_50_500_mA:
					return [0.05, 0.35, 0.1];			// [min, max, step] in A
				case cigtu_Cal_Imes_5_50_mA:
					return [0.005, 0.05, 0.01];			// [min, max, step] in A
				case cigtu_Cal_Imes_05_5mA:
					return [0.0005, 0.005, 0.001];		// [min, max, step] in A
				case cigtu_Cal_Imes_50_500mkA:
					return [1, 10, 3];			// [min, max, step] in mA
				case cigtu_Cal_Imes_2_50mkA:
					return [1, 10, 3];			// [min, max, step] in mA
				case cigtu_Cal_Imes_200_2000nA:
					return [2, 20, 5];			// [min, max, step] in mA
				case cigtu_Cal_Imes_20_200nA:
					return [2, 20, 5];			// [min, max, step]	in mA
				case cigtu_Cal_Imes_2_20nA:
					return [2, 20, 5];			// [min, max, step]	in mA
				default:
					return [];
			}

		case cigtu_Cal_Iset:
			switch(CurrentRange)
			{
				case 11:
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
function CIGTU_KEI_Init(CalibrationType)
{
	if(CalibrationType == cigtu_Cal_Vmes || CalibrationType == cigtu_Cal_Vpotmes || CalibrationType == cigtu_Cal_Vset) 	
	{
		KEI_ConfigVoltageDC(CAL_NPLC);
	}
	else
	{
		KEI_ConfigCurrentDC(CAL_NPLC);
	}
	KEI_MakeTestBufferVoltageDC(CAL_NPLC, CAL_V_PulsePlate * 0.5);
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
					return "cigtu_Cal_Imes_20_200nA "
				case cigtu_Cal_Imes_2_20nA:
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
