include("TestLCTU.js")
include("DMM6500.js")
include("CalGeneral.js")

// Setup parameters for "DMM6000"
cal_Ice_PulsePlate 		= 10000 		// in us
cal_Ice_TriggerDelay	= 50000 		// in us
cal_VmsrProbe 			= 500 			// in Vout/Vin
CAL_NPLC = 0.02;

// Counters
clctu_cntTotal = 0;
clctu_cntDone = 0;

// Results storage
clctu = [];

// Tektronix data
clctu_sc = [];

// Relative error
clctu_err = [];

// Summary error
clctu_err_sum = [];

// Correction
clctu_corr = [];

// Iterations
clctu_Iterations = 3;

// Calibration types 
clctu_Cal_Vmes = 0;
clctu_Cal_Vset = 1;
clctu_Cal_Imes = 2;
CalibrationType = clctu_Cal_Vmes;

// Current Range
clctu_Cal_Imes_100_300_mA = 1;
clctu_Cal_Imes_10_100_mA = 2;
clctu_Cal_Imes_1_10mA = 3;
clctu_Cal_Imes_100_1000mkA = 4;
clctu_Cal_Imes_10_100mkA = 5;
clctu_Cal_Imes_2_30mA = 6;

// Voltage Range
clctu_Cal_Vmes_500_7000_V = 10;
clctu_Cal_Vmes_200_1300_V = 11;
clctu_Cal_Vmes_1300_3300_V = 12;

Range = clctu_Cal_Imes_100_300_mA;

function CLCTU_Init(portDevice)
{
	// Init device port
	dev.Disconnect();
	dev.co(portDevice);

	// DMM6500 init
	KEI_Reset();
}
// Калибровка 
function CLCTU_Calibrate(Calibration_Type, Cal_Range)
{
	CalibrationType = Calibration_Type;
	Range = Cal_Range;
	CLCTU_ResetA();
	CLCTU_ResetCal(CalibrationType, Range);
	if (CLCTU_Collect(clctu_Iterations, CalibrationType, Range))
		CLCTU_Save(CLCTU_NameSwitch(CalibrationType, Range));

	// Plot relative error distribution
	scattern(clctu_sc, clctu_err, "Messure", "Error (in %)", CLCTU_NameSwitch(CalibrationType, Range)); 
	sleep(200);
	scattern(clctu_sc, clctu_err_sum, "Messure", "Sum Error (in %)", CLCTU_NameSwitch(CalibrationType, Range));
	
	// Calculate correction
	clctu_corr = CGEN_GetCorrection2(CLCTU_NameSwitch(CalibrationType, Range));
	CLCTU_WriteCal(clctu_corr, CalibrationType, Range)

		
	// Print correction
	CLCTU_PrintCoef(CalibrationType, Range)
}
//--------------------
// Верификация
function CLCTU_Verify(Calibration_Type, Cal_Range)
{
	CalibrationType = Calibration_Type;
	Range = Cal_Range;
	CLCTU_ResetA();
	if (CLCTU_Collect(clctu_Iterations, CalibrationType, Range))
		CLCTU_Save(CLCTU_NameSwitch(CalibrationType, Range))

	// Plot relative error distribution
	scattern(clctu_sc, clctu_err, "Messure", "Error (in %)", CLCTU_NameSwitch(CalibrationType, Range)); 
	sleep(200);
	scattern(clctu_sc, clctu_err_sum, "Messure", "Sum Error (in %)", CLCTU_NameSwitch(CalibrationType, Range));
}
//--------------------
// Сбор данных 
function CLCTU_Collect(IterationsCount, CalibrationType, Range)
{
	// Находим диапазон 
	var RangeData = CLCTU_GetRange(CalibrationType, Range);
	var clctu_min = RangeData[0];
	var clctu_max = RangeData[1];
	var clctu_stp = RangeData[2];
	var clctu_Values = CGEN_GetRange(clctu_min, clctu_max, clctu_stp);
	
	// Спрашиваем о корректности подключения к СИ
	if(CalibrationType == clctu_Cal_Imes)
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

	// Спрашиваем о номинале подключенной нагрузки
	print("Enter resistance set to Ohms ?");
	print("-----------");
	var clctu_Res = parseFloat(readline());
	
	if (isNaN(clctu_Res))
		clctu_Res = 1;
	
	clctu_cntTotal = IterationsCount * clctu_Values.length;
	clctu_cntDone = 0;
	
	// Конфигурация DMM6500
	
	CLCTU_KEI_Init(CalibrationType);
	
	// Конфигурация и запуск формирования для LCTU
	for (var i = 0; i < IterationsCount; i++)
	{
		for (var j = 0; j < clctu_Values.length; j++)
		{
			KEI_ClearBuffer();	
			switch(CalibrationType)
			{
				case clctu_Cal_Vmes:
				case clctu_Cal_Vset:
					KEI_SetVoltageDCRange(clctu_Values[j] / cal_VmsrProbe);
					break;
				case clctu_Cal_Imes:
					KEI_SetCurrentDCRange(clctu_Values[j] / clctu_Res);
					break;
			}
			KEI_OPC();
			KEI_ActivateTrigger();

			switch(CalibrationType)
			{
				case clctu_Cal_Vmes:
					switch(Range)
					{
						case clctu_Cal_Vmes_500_7000_V:
						case clctu_Cal_Vmes_200_1300_V:
						case clctu_Cal_Vmes_1300_3300_V:
							LCTU_Start(clctu_Values[j], cal_Ice_PulsePlate * 1e-3);
							break;
						default:
							break;
					}
					break;
					
				case clctu_Cal_Vset:
					LCTU_Start(clctu_Values[j], cal_Ice_PulsePlate * 1e-3);
					break;
				default:
					break;
					
				case clctu_Cal_Imes:
					switch(Range)
					{
						case clctu_Cal_Imes_100_300_mA:
						case clctu_Cal_Imes_10_100_mA:
						case clctu_Cal_Imes_1_10mA:
						case clctu_Cal_Imes_100_1000mkA:
						case clctu_Cal_Imes_10_100mkA:
							dev.w(151, Range);
							LCTU_Start(clctu_Values[j], cal_Ice_PulsePlate * 1e-3);
						case clctu_Cal_Imes_2_30mA:
							LCTU_Start(clctu_Values[j], cal_Ice_PulsePlate * 1e-3);
							break;
						default:
							break;
					}
					break;
			}
			
			// Получаем значения
			sleep(2000);
			var scdata = KEI_ReadAverage();
			
			if(CalibrationType == clctu_Cal_Vset) 
				var lctudata = clctu_Values[j];
			else if(CalibrationType == clctu_Cal_Vmes) 	
				var lctudata = dev.rf(200);	
			else
				var lctudata = dev.rf(201) * 1e3;


			// gtu data
			clctu.push(lctudata);
			// DMM6500 data
			clctu_sc.push(scdata);
			// relative error
			var errdata = ((lctudata - scdata) / scdata * 100).toFixed(4);
			clctu_err.push(errdata);
			// Summary error
			if(CalibrationType == clctu_Cal_Vmes || CalibrationType == clctu_Cal_Vset)
				var E0 = KEI_V_Err(clctu_Values[j] * cal_VmsrProbe);
			else
				var E0 = KEI_I_Err(clctu_Values[j]);
			var err_sumdata = Math.sign_ma(errdata) * (Math.abs(errdata) + E0);
			clctu_err_sum.push(err_sumdata);
				
				
			print("LCTU: " + lctudata);
			print("DMM6500: " + scdata);
			
			clctu_cntDone++;
			print("-- result " + clctu_cntDone + " of " + clctu_cntTotal + " --");
			
			sleep(1000);
			dev.w(151,0);	// reset range
		}
			
		if (anykey()) return 0;
	}
		
	return 1;
}
//--------------------
// 
function CLCTU_ResetA()
{
// Results storage
clctu = [];

// Tektronix data
clctu_sc = [];

// Relative error
clctu_err = [];

// Summary error
clctu_err_sum = [];

// Correction
clctu_corr = [];
}
//--------------------
//
function CLCTU_GetRange(CalibrationType, Range)
{
	switch(CalibrationType)
	{
		case clctu_Cal_Vmes:
			switch(Range)
			{
				case clctu_Cal_Vmes_500_7000_V:
					return [500, 7000, 500];			// [min, max, step] in V
				case clctu_Cal_Vmes_200_1300_V:
					return [200, 1300, 100];			// [min, max, step] in V
				case clctu_Cal_Vmes_1300_3300_V:
					return [1300, 3300, 200];			// [min, max, step] in V
				default:
					return [];
			}

		case clctu_Cal_Vset:
			return [500, 7000, 500];					// [min, max, step] in V
			
		case clctu_Cal_Imes:
			switch(Range)
			{
				case clctu_Cal_Imes_100_300_mA:
					return [500, 7000, 500];			// [min, max, step] in V xx Om
				case clctu_Cal_Imes_10_100_mA:
					return [500, 7000, 500];			// [min, max, step] in V xx Om
				case clctu_Cal_Imes_1_10mA:
					return [500, 7000, 500];			// [min, max, step] in V xx kOm
				case clctu_Cal_Imes_100_1000mkA:
					return [500, 7000, 500];			// [min, max, step] in V xx kOm
				case clctu_Cal_Imes_10_100mkA:
					return [500, 7000, 500];			// [min, max, step] in V xx kOm
				case clctu_Cal_Imes_2_30mA:
					return [500, 7000, 500];			// [min, max, step] in V xx kOm
				default:
					return [];
			}

	}
	
	return [];
}
//--------------------
//
function CLCTU_GetCoefReg(CalibrationType, Range)
{
	switch(CalibrationType)
	{
		case clctu_Cal_Vmes:
			switch(Range)
			{
				case clctu_Cal_Vmes_500_7000_V:
					return [[1, 2, 3]];		// [P2, P1, P0]
				case clctu_Cal_Vmes_200_1300_V:
					return [[2, 3, 4]];		// [P2, P1, P0]
				case clctu_Cal_Vmes_1300_3300_V:
					return [[7, 8, 9]];		// [P2, P1, P0]
				default:
					return [[1, 2, 3]];		// [P2, P1, P0]
			}
			
		case clctu_Cal_Vset:
			return [[61, 62, 63]];			// [P2, P1, P0]
			
		case clctu_Cal_Imes:
			switch(Range)
			{
				case clctu_Cal_Imes_100_300_mA:
					return [[11, 12, 13]];	// [P2, P1, P0]
				case clctu_Cal_Imes_10_100_mA:
					return [[17, 18, 19]];	// [P2, P1, P0]
				case clctu_Cal_Imes_1_10mA:
					return [[23, 24, 25]];	// [P2, P1, P0]
				case clctu_Cal_Imes_100_1000mkA:
					return [[29, 30, 31]];	// [P2, P1, P0]
				case clctu_Cal_Imes_10_100mkA:
					return [[35, 36, 37]];	// [P2, P1, P0]
				case clctu_Cal_Imes_2_30mA:
					return [[12, 13, 14]];	// [P2, P1, P0]
				default:
					return [[11, 12, 13]];	// [P2, P1, P0]
			}
	}
	
	return [];
}
//--------------------
//
function CLCTU_SetCoef(Reg, Data)
{
	dev.wf(Reg[0], Data[0]);
	dev.wf(Reg[1], Data[1]);
	dev.wf(Reg[2], Data[2]);
}
//--------------------
//
function CLCTU_ResetCal(CalibrationType, Range)
{
	var RegList = CLCTU_GetCoefReg(CalibrationType, Range);
	var Data = [0, 1, 0];
	
	for (var i = 0; i < RegList.length; i++)
		CLCTU_SetCoef(RegList[i], Data);
}
//--------------------
//
function CLCTU_PrintCoef(CalibrationType, Range)
{
	var RegList = CLCTU_GetCoefReg(CalibrationType, Range);
	
	for (var i = 0; i < RegList.length; i++)
	{
		print("P2 (reg " + RegList[i][0] + "): " + dev.rf(RegList[i][0]));
		print("P1 (reg " + RegList[i][1] + "): " + dev.rf(RegList[i][1]));
		print("P0 (reg " + RegList[i][2] + "): " + dev.rf(RegList[i][2]));
	}
}
//--------------------
//
function CLCTU_Save(Name)
{
	CGEN_SaveArrays(Name, clctu, clctu_sc, clctu_err, clctu_err_sum);
}
//--------------------
//
function CLCTU_WriteCal(Data, CalibrationType, Range)
{
	var RegList = CLCTU_GetCoefReg(CalibrationType, Range);
	
	for (var i = 0; i < RegList.length; i++)
		CLCTU_SetCoef(RegList[i], Data);
}
//--------------------
//
function CLCTU_KEI_Init(CalibrationType)
{
	if(CalibrationType == clctu_Cal_Vmes || CalibrationType == clctu_Cal_Vset) 	
	{
		KEI_ConfigVoltageDC(CAL_NPLC, 'OFF');
		KEI_FilterConfig('VOLT' , 1, 'MOV', 10);
	}
	else
	{
		KEI_ConfigCurrentDC(CAL_NPLC, "ON");
		KEI_FilterConfig('CURR' , 1, 'MOV', 100);	
	}

	KEI_MakeTestBufferVoltageDC(CAL_NPLC, (cal_Ice_PulsePlate * 0.6 - cal_Ice_TriggerDelay));
	KEI_ConfigExtTrigger(cal_Ice_TriggerDelay * 1e-6);
}
//--------------------
//
function CLCTU_NameSwitch(CalibrationType, Range) 
{
 switch(CalibrationType)
	{
		case clctu_Cal_Vmes:
			switch(Range)
			{
				case clctu_Cal_Vmes_500_7000_V:
					return "clctu_Cal_Vmes_500_7000_V"
				case clctu_Cal_Vmes_200_1300_V:
					return "clctu_Cal_Vmes_200_1300_V"
				case clctu_Cal_Vmes_1300_3300_V:
					return "clctu_Cal_Vmes_1300_3300_V"
				default:
					return 0
			}
			
		case clctu_Cal_Vset:
			return "clctu_Cal_Vset";	
			
		case clctu_Cal_Imes:
			switch(Range)
			{
				case clctu_Cal_Imes_100_300_mA:
					return "clctu_Cal_Imes_100_300_mA"
				case clctu_Cal_Imes_10_100_mA:
					return "clctu_Cal_Imes_10_100_mA"
				case clctu_Cal_Imes_1_10mA:
					return "clctu_Cal_Imes_1_10mA"
				case clctu_Cal_Imes_100_1000mkA:
					return "clctu_Cal_Imes_100_1000mkA"
				case clctu_Cal_Imes_10_100mkA:
					return "clctu_Cal_Imes_10_100mkA"
				case clctu_Cal_Imes_2_30mA:
					return "clctu_Cal_Imes_2_30mA"
				default:
					return 0
			}
	}
	
	return 0;
}
