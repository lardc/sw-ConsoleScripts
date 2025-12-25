include("CalGeneral.js")
include("DMM6500.js")
include("TestLCSU.js")
include("Tektronix.js")

clcsu_RShunt = 0.00025; // сопротивление шунта, Ом
clcsu_NPLC = 0.0005;

clcsu_ErrShunt = 0.5; // погрешность шунта в %
clcsu_ErrDMM6500 = 0.0065; // наихудшая погрешность мультиметра в %
clcsu_NoiseDMM6500 = 0.083; // наихудшая погрешность, вносимая шумами мультиметра, в %

SINE_SHAPE 		= 0 // синус
MOD_SINE_SHAPE 	= 1 // модифицированный синус
TRAPEZE_SHAPE	= 2 // трапеция
clcsu_PulseType = SINE_SHAPE;

clcsu_Iterations = 3;
clcsu_Points = 10;
clcsu_CurrentRange = 0; // 0 = диапазон [ 70...350 A]; 1 = диапазон [ 350...1100 A]; 2 = диапазон [ 1100...6500 A]

clcsu_IdMin = [160, 351, 1101]; // начальные и конечные значения диапазонов по току
clcsu_IdMax = [350, 1100, 6500];
clcsu_Pulse = 10 // длительность импульса в мс

clcsu_Reg_DAC_Coarse = [];
clcsu_Reg_ADC_Coarse = [];
clcsu_Reg_DAC_Fine = [];
clcsu_Reg_ADC_Fine = [];

// Counters
clcsu_CntTotal = 0;
clcsu_CntDone = 0;

// Results storage
clcsu_IdSet = [];
clcsu_IdDAC = [];
clcsu_Id = [];

// Tektronix/DMM6500 data
clcsu_IdSc = [];

// Relative error
clcsu_IdSetErr = [];
clcsu_IdErr = [];

// Summary error
clcsu_IdSetErrSumm = [];

function CLCSU_Init(portDevice)
{
	// Init device port
	dev.Disconnect();
	dev.co(portDevice);

	// DMM6500 init
	KEI_Reset();
}

function CLCSU_CalibrateDAC() // калибровка ЦАП с выключеным регулятором (без сброса К и В)
{
	CLCSU_Reset();

	// DMM6500 Init
	CLCSU_KEI_Init();
	CLCSU_RegDAC();
	print("Значение регистров до калибровки:");
	CLCSU_PrintCoefDAC();
	CLCSU_ResetIdSetCal();

	if(CLCSU_CheckRegulatorStatus())
	{
		print("Регулятор включен. Калибровка ЦАП недоступна");
		return;
	}
	else
		print("Регулятор отключен");
	print("--------------------");

	if(CLCSU_KEI_CollectId())
	{
		CLCSU_Plot(1, 0);
	
		var DACCoefficients = CGEN_GetNumericCorrection(clcsu_IdSc, clcsu_IdDAC);
		
		if(clcsu_CurrentRange == 1 || clcsu_CurrentRange == 2)
			DACCoefficients[1] = DACCoefficients[1] * 6; // в формировании тока участвуют 6 силовых плат

		CLCSU_CalDAC(DACCoefficients[1], DACCoefficients[0]);
		CLCSU_PrintCoefDAC();
	}
}

function CLCSU_CalibrateDAC_Fine() // калибровка ЦАП с выключенным регулятором коэффициентами P2, P1, P0
{
	CLCSU_Reset();
	CLCSU_RegDAC();
	print("Значение регистров до калибровки:");
	CLCSU_PrintCoefIdSet();
	CLCSU_ResetIdSetCal();

	if(CLCSU_CheckRegulatorStatus())
	{
		print("Регулятор включен. Калибровка ЦАП недоступна");
		return;
	}
	else
		print("Регулятор отключен");
	print("--------------------");

	// DMM6500 Init
	CLCSU_KEI_Init();

	if (CLCSU_KEI_CollectId())
	{
		CLCSU_Plot(1, 0);

		// Calculate correction
		var DAC_FineCoefficients = CGEN_GetNumericCorrection2(clcsu_IdSc, clcsu_IdSet);
		CLCSU_CalIdSet(DAC_FineCoefficients[0], DAC_FineCoefficients[1], DAC_FineCoefficients[2]);
		CLCSU_PrintCoefIdSet();
	}
}

function CLCSU_CalibrateADC() // калибровка АЦП с выключеным регулятором (без сброса К и В)
{
	CLCSU_Reset();
	CLCSU_RegADC();
	print("Значение регистров до калибровки:");
	CLCSU_PrintCoefADC();
	CLCSU_ResetIdCal();

	// DMM6500 Init
	CLCSU_KEI_Init();

	if(CLCSU_CheckRegulatorStatus())
	{
		print("Регулятор включен. Калибровка АЦП недоступна");
		return;
	}
	else
		print("Регулятор отключен");
	print("--------------------");

	if (CLCSU_KEI_CollectId())
	{	
		CLCSU_Plot(0, 1);

		var clcsu_RawUnitValues = CLCSU_RawUnitValues();
		var clcsu_RawScValues = CLCSU_RawScValuesForADC();
		var ADCCoefficients = CGEN_GetNumericCorrection(clcsu_RawUnitValues, clcsu_RawScValues);
		CLCSU_CalADC(ADCCoefficients[1], ADCCoefficients[0]);
		CLCSU_PrintCoefADC();
	}
}

function CLCSU_CalibrateId() // калибровка задания тока с включеным регулятором
{
	CLCSU_Reset();
	CLCSU_RegADC();
	print("Значение регистров до калибровки:");
	CLCSU_PrintCoefId();
	CLCSU_ResetIdCal();

	if(CLCSU_CheckRegulatorStatus())
		print("Регулятор включен");
	else
	{
		print("Регулятор отключен. Включите регулятор");
		return;
	}
	print("--------------------");

	// DMM6500 Init
	CLCSU_KEI_Init();

	if (CLCSU_KEI_CollectId())
	{
		CLCSU_Plot(1, 1);

		// Calculate correction
		var ADCCoefficients = CGEN_GetNumericCorrection2(clcsu_IdSet, clcsu_IdSc);
		CLCSU_CalId(ADCCoefficients[0], ADCCoefficients[1], ADCCoefficients[2]);
		CLCSU_PrintCoefId();
	}
}

function CLCSU_VerifyId()
{
	CLCSU_Reset();

	// DMM6500 Init
	CLCSU_KEI_Init();

	if(CLCSU_CheckRegulatorStatus())
		print("Регулятор включен");
	else
		print("Регулятор отключен");
	print("--------------------");
	
	if (CLCSU_KEI_CollectId())
	{
		CLCSU_Plot(1, 1);
	}
}

function CLCSU_KEI_CollectId()
{
	var CurrentArray = CGEN_GetRangeLogarithm(clcsu_IdMin[clcsu_CurrentRange], clcsu_IdMax[clcsu_CurrentRange], clcsu_Points);

	clcsu_CntTotal = clcsu_Iterations * CurrentArray.length;
	clcsu_CntDone = 1;

	for (var i = 0; i < clcsu_Iterations; i++)
	{	
		for (var j = 0; j < CurrentArray.length; j++)
		{
			print("-- result " + clcsu_CntDone++ + " of " + clcsu_CntTotal + " --");

			KEI_ClearBuffer();
			KEI_VoltageDCTriggerLevel(CurrentArray[j] * clcsu_RShunt / 2);
			KEI_SetVoltageDCRange(CurrentArray[j] * clcsu_RShunt);
			KEI_ActivateTrigger();

			sleep(1000);
			
			var lcsu_printt_copy = lcsu_print;
			lcsu_print = 0;
			if(!LCSU_Start(clcsu_PulseType, CurrentArray[j], clcsu_Pulse))
				return 0;

			lcsu_print = lcsu_printt_copy;
			sleep(2000);

			switch (clcsu_PulseType)
			{
				case SINE_SHAPE:
				case MOD_SINE_SHAPE:
					var IdSc = KEI_ReadArrayMaximum() / clcsu_RShunt;
					break;
				case TRAPEZE_SHAPE:
					var IdSc = KEI_ReadArrayTrapeze() / clcsu_RShunt;
					break;
				default:
					print("Incorrect pulse type.");
					break;
			}

			var Id_DACArray = dev.raff(6);
			var IdDAC = Math.max.apply(null, Id_DACArray);
			var IdMeas = dev.rf(200);
			var IdSet = CurrentArray[j];
			var IdErrSet = ((IdSc - IdSet) / IdSet * 100);
			var IdErrMeas = ((IdMeas - IdSc) / IdSc * 100);
			var E0 = 1.1 * Math.sqrt((clcsu_ErrShunt * clcsu_ErrShunt) + (clcsu_ErrDMM6500 * clcsu_ErrDMM6500) + (clcsu_NoiseDMM6500 * clcsu_NoiseDMM6500));

			clcsu_IdSc.push(IdSc);
			clcsu_Id.push(IdMeas);
			clcsu_IdDAC.push(IdDAC);
			clcsu_IdSetErr.push(+IdErrSet);
			clcsu_IdSetErrSumm.push(Math.sign_ma(IdErrSet) * (Math.abs(IdErrSet) + E0));

			clcsu_IdErr.push(+IdErrMeas);
			clcsu_IdSet.push(+CurrentArray[j].toFixed(2));

			print("DAC        " + IdDAC);
			print("IdSet, A:  " + IdSet);
			print("IdMeas, A: " + IdMeas);
			print("IdSc, A:   " + IdSc);
			print("IdSetErr, %:  " + IdErrSet);
			print("IdMeasErr, %: " + IdErrMeas);
			print("--------------------");

			if (anykey()) return 0;
		}
	}
	
	return 1;
}

function CLCSU_KEI_Init()
{
	KEI_ConfigVoltageDC(clcsu_NPLC);
	KEI_MakeTestBufferVoltageDC(clcsu_NPLC, clcsu_Pulse * 1000);
	KEI_ConfigVoltageDCEdgeTrigger();
}

function CLCSU_Plot(PrintIdset, PrintId)
{
	if(PrintIdset)
	{
		scattern(clcsu_IdSet, clcsu_IdSetErr, "IdSet, A", "Err, %", "Id Set relative error, Pulse type = " 
			+ clcsu_PulseType + ", " + clcsu_IdMin[clcsu_CurrentRange] + "-" + clcsu_IdMax[clcsu_CurrentRange] + " А");
		scattern(clcsu_IdSet, clcsu_IdSetErrSumm, "IdSet, A", "Err, %", "Id set summary error, Pulse type = " 
			+ clcsu_PulseType + ", " + clcsu_IdMin[clcsu_CurrentRange] + "-" + clcsu_IdMax[clcsu_CurrentRange] + " А");
	}
	
	if(PrintId)
		scattern(clcsu_IdSc, clcsu_IdErr, "IdSc, A", "Err, %", "Id relative error, Pulse type = " 
			+ clcsu_PulseType + ", " + clcsu_IdMin[clcsu_CurrentRange] + "-" + clcsu_IdMax[clcsu_CurrentRange] + " А");
}

function CLCSU_Reset()
{
	clcsu_IdSc = [];
	clcsu_Id = [];
	clcsu_IdDAC = [];
	clcsu_IdSetErr = [];
	clcsu_IdErr = [];
	clcsu_IdSetErrSumm = [];
	clcsu_IdSet = [];
	clcsu_Reg_DAC_Coarse = [];
	clcsu_Reg_ADC_Coarse = [];
	clcsu_Reg_DAC_Fine = [];
	clcsu_Reg_ADC_Fine = [];
}

function CLCSU_CheckRegulatorStatus()
{
	if (dev.rf(44) != 0 || dev.rf(45) != 0 || dev.rf(46) != 0 || dev.rf(47) != 0 || dev.rf(70) != 0 || dev.rf(71) != 0)
		return true;
	else
		return false;
}

function CLCSU_RegDAC() 
{
	switch(clcsu_CurrentRange)
	{
		case 0:
			clcsu_Reg_DAC_Coarse[0] = 23; // коэф. К
			clcsu_Reg_DAC_Coarse[1] = 24; // коэф. B
			clcsu_Reg_DAC_Fine[0]	= 22; // P0
			clcsu_Reg_DAC_Fine[1]	= 21; // P1
			clcsu_Reg_DAC_Fine[2]	= 20; // P2
				break;
		case 1:
			clcsu_Reg_DAC_Coarse[0] = 28;
			clcsu_Reg_DAC_Coarse[1] = 29;
			clcsu_Reg_DAC_Fine[0]	= 27;
			clcsu_Reg_DAC_Fine[1]	= 26;
			clcsu_Reg_DAC_Fine[2]	= 25;
				break;
		case 2:
			clcsu_Reg_DAC_Coarse[0] = 67;
			clcsu_Reg_DAC_Coarse[1] = 68;
			clcsu_Reg_DAC_Fine[0]	= 66;
			clcsu_Reg_DAC_Fine[1]	= 65;
			clcsu_Reg_DAC_Fine[2]	= 64;
				break;
		default:
			print("Incorrect current range");
			break;
	}
}

function CLCSU_RegADC() 
{
	switch(clcsu_CurrentRange)
	{
		case 0:
			clcsu_Reg_ADC_Coarse[0] = 37; // коэф. К
			clcsu_Reg_ADC_Coarse[1] = 38; // коэф. B
			clcsu_Reg_ADC_Fine[0]	= 36; // P0
			clcsu_Reg_ADC_Fine[1]	= 35; // P1
			clcsu_Reg_ADC_Fine[2]	= 34; // P2
				break;
		case 1:
		case 2:
			clcsu_Reg_ADC_Coarse[0] = 42;
			clcsu_Reg_ADC_Coarse[1] = 43;
			clcsu_Reg_ADC_Fine[0]	= 41;
			clcsu_Reg_ADC_Fine[1]	= 40;
			clcsu_Reg_ADC_Fine[2]	= 39;
				break;
		default:
			print("Incorrect current range");
			break;
	}
}

function CLCSU_CalIdSet(P0, P1, P2)
{
	dev.wf(clcsu_Reg_DAC_Fine[0], P0);
	dev.wf(clcsu_Reg_DAC_Fine[1], P1);
	dev.wf(clcsu_Reg_DAC_Fine[2], P2);
}

function CLCSU_CalId(P0, P1, P2)
{
	dev.wf(clcsu_Reg_ADC_Fine[0], P0);
	dev.wf(clcsu_Reg_ADC_Fine[1], P1);
	dev.wf(clcsu_Reg_ADC_Fine[2], P2);
}

function CLCSU_CalDAC(K, B)
{
	dev.wf(clcsu_Reg_DAC_Coarse[0], K);
	dev.wf(clcsu_Reg_DAC_Coarse[1], B);	
}

function CLCSU_CalADC(K, B)
{
	dev.wf(clcsu_Reg_ADC_Coarse[0], K);
	dev.wf(clcsu_Reg_ADC_Coarse[1], B);	
}

function CLCSU_RawUnitValues()
{
	var RawVoltage = [];
	var REG_SHUNT_RESISTANCE = dev.rf(5)

	K = dev.rf(clcsu_Reg_ADC_Coarse[0]);
	B = dev.rf(clcsu_Reg_ADC_Coarse[1]);

	for (var l = 0; l < clcsu_Id.length; l++)
		RawVoltage[l] = clcsu_Id[l] * REG_SHUNT_RESISTANCE / 1000;

	RawCurrent = CGEN_ComputeRawArray(RawVoltage, 0, K, B);

	return RawCurrent;
}

function CLCSU_RawScValuesForADC()
{
	var RawScVoltage = [];
	var REG_SHUNT_RESISTANCE = dev.rf(5)

	for (var l = 0; l < clcsu_IdSc.length; l++)
		RawScVoltage[l] = clcsu_IdSc[l] * REG_SHUNT_RESISTANCE / 1000;

	return RawScVoltage;
}

function CLCSU_PrintCoefIdSet()
{
	print("P2 (reg " + clcsu_Reg_DAC_Fine[2] + "): " + dev.rf(clcsu_Reg_DAC_Fine[2]));
	print("P1 (reg " + clcsu_Reg_DAC_Fine[1] + "): " + dev.rf(clcsu_Reg_DAC_Fine[1]));
	print("P0 (reg " + clcsu_Reg_DAC_Fine[0] + "): " + dev.rf(clcsu_Reg_DAC_Fine[0]));
	print("--------------------");
}

function CLCSU_PrintCoefId()
{
	print("P2 (reg " + clcsu_Reg_ADC_Fine[2] + "): " + dev.rf(clcsu_Reg_ADC_Fine[2]));
	print("P1 (reg " + clcsu_Reg_ADC_Fine[1] + "): " + dev.rf(clcsu_Reg_ADC_Fine[1]));
	print("P0 (reg " + clcsu_Reg_ADC_Fine[0] + "): " + dev.rf(clcsu_Reg_ADC_Fine[0]));
	print("--------------------");
}

function CLCSU_PrintCoefDAC()
{
	print("K (reg " + clcsu_Reg_DAC_Coarse[0] + "): " + dev.rf(clcsu_Reg_DAC_Coarse[0]));
	print("B (reg " + clcsu_Reg_DAC_Coarse[1] + "): " + dev.rf(clcsu_Reg_DAC_Coarse[1]));
	print("--------------------");
}

function CLCSU_PrintCoefADC()
{
	print("K (reg " + clcsu_Reg_ADC_Coarse[0] + "): " + dev.rf(clcsu_Reg_ADC_Coarse[0]));
	print("B (reg " + clcsu_Reg_ADC_Coarse[1] + "): " + dev.rf(clcsu_Reg_ADC_Coarse[1]));
	print("--------------------");
}

function CLCSU_ResetIdCal()
{
	print("Были сброшены регистры измерения тока P2, P1, P0");
	print("--------------------");
	CLCSU_CalId(0, 1, 0);
}

function CLCSU_ResetIdSetCal()
{
	print("Были сброшены регистры задания тока P2, P1, P0");
	print("--------------------");
	CLCSU_CalIdSet(0, 1, 0);
}

///--- Функции для осциллографа Tektronix и иных прочих ---///

function CAL_Init(portDevice, portTek, channelMeasureId)
{
	if (channelMeasureId < 1 || channelMeasureId > 4)
	{
		print("Wrong channel numbers");
		return;
	}

	// Copy channel information
	cal_chMeasureId = channelMeasureId;

	// Init device port
	dev.Disconnect();
	dev.Connect(portDevice);

	// Init Tektronix port
	TEK_PortInit(portTek);
	
	// Tektronix init
	for (var i = 1; i <= 4; i++)
	{
		if (i == channelMeasureId)
			TEK_ChannelOn(i);
		else
			TEK_ChannelOff(i);
	}
}
//--------------------

function CAL_VerifyId()
{		
	CAL_ResetA();
	
	// Tektronix init
	CAL_TekInit();

	// Reload values
	var CurrentArray = CGEN_GetRange(cal_IdMin[cal_CurrentRange], cal_IdMax[cal_CurrentRange], cal_IdStp);

	if (CAL_CollectId(CurrentArray, cal_Iterations))
	{
		CAL_SaveId("LCSU_Id_fixed");

		// Plot relative error distribution
		scattern(cal_IdSc, cal_IdErr, "Current (in A)", "Error (in %)", "Current setpoint relative error");
	}
}
//--------------------
function CAL_CalibrateId()
{		
	CAL_ResetA();
	CAL_ResetIdCal();
	
	// Tektronix init
	CAL_TekInit(cal_chMeasureId);

	// Reload values
	var cal_IdStp = Math.round((cal_IdMax[cal_CurrentRange] - cal_IdMin[cal_CurrentRange]) / (cal_Points - 1));
	var CurrentArray = CGEN_GetRange(cal_IdMin[cal_CurrentRange], cal_IdMax[cal_CurrentRange], cal_IdStp);

	if (CAL_CollectId(CurrentArray, cal_Iterations))
	{
		CAL_SaveId("LSLPC_Id");

		// Plot relative error distribution
		scattern(cal_IdSc, cal_IdErr, "Current (in A)", "Error (in %)", "Current setpoint relative error");

		// Calculate correction
		cal_IdCorr = CGEN_GetCorrection2("LSLPC_Id");
		CAL_SetCoefId(cal_IdCorr[0], cal_IdCorr[1], cal_IdCorr[2]);
		CAL_PrintCoefId();
	}
}
//-------------------------

function CAL_ResetA()
{	
	// Results storage
	cal_Id = [];

	// Tektronix data
	cal_IdSc = [];

	// Relative error
	cal_IdErr = [];

	// Correction
	cal_IdCorr = [];
}
//--------------------
function CAL_TekInit()
{
	TEK_ChannelInit(cal_chMeasureId, "1", "0.01");
	TEK_TriggerPulseInit(cal_chMeasureId, "0.04");
	TEK_Horizontal("0.250e-3", "0");
	TEK_Send("measurement:meas" + cal_chMeasureId + ":source ch" + cal_chMeasureId);
	TEK_Send("measurement:meas" + cal_chMeasureId + ":type maximum");
}
//--------------------

function CAL_CollectId(CurrentValues, IterationsCount)
{
	cal_CntTotal = IterationsCount * CurrentValues.length;
	cal_CntDone = 1;

	var AvgNum;
	if (cal_UseAvg)
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
			print("-- result " + cal_CntDone++ + " of " + cal_CntTotal + " --");
			//
			LCSU_TekScale(cal_chMeasureId, CurrentValues[j] * cal_clcsu_RShunt / 1000000);
			
			for (var k = 0; k < AvgNum; k++)
			{
				if(!LCSU_Start(CurrentValues[j]))
					return false;
			}
			
			// Unit data
			var IdSet = dev.r(128);
			cal_Id.push(IdSet);
			print("Idset, A: " + IdSet);

			// Scope data
			var IdSc = (CAL_Measure(cal_chMeasureId) / cal_clcsu_RShunt * 1000000).toFixed(2);
			cal_IdSc.push(IdSc);
			print("Idtek, A: " + IdSc);

			// Relative error
			var IdErr = ((IdSet - IdSc) / IdSc * 100).toFixed(2);
			cal_IdErr.push(IdErr);
			print("IdSetErr, %: " + IdErr);
			print("--------------------");


			
			if (anykey()) return 0;
		}
	}

	return 1;
}
//--------------------
function LCSU_TekScale(Channel, Value)
{
	Value = Value / 6;
	TEK_Send("ch" + Channel + ":scale " + Value);
	
	TEK_TriggerPulseInit(cal_chMeasureId, Value * 1);
}
//--------------------

function CAL_Measure(Channel)
{
	return TEK_Measure(Channel);
}
//--------------------

function CAL_SaveId(NameId)
{
	CGEN_SaveArrays(NameId, cal_Id, cal_IdSc, cal_IdErr);
}
//--------------------

function CAL_CollectMesure(CurrentValues, IterationsCount)
{
	cal_CntTotal = IterationsCount * CurrentValues.length;
	cal_CntDone = 1;

	var AvgNum;
	if (cal_UseAvg)
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
			print("-- result " + cal_CntDone++ + " of " + cal_CntTotal + " --");
			//
			LCSU_TekScale(cal_chMeasureId, CurrentValues[j] * cal_clcsu_RShunt / 1000000);
			
			for (var k = 0; k < AvgNum; k++)
			{
				if(!LCSU_Start(CurrentValues[j]))
					return false;
			}
			
			// Unit data
			var IdSet = dev.rf(128);
			cal_Id.push(IdSet);
			print("Idset, A: " + IdSet);

			// Unit data
			var IdMes = dev.rf(200);
			cal_IdMes.push(IdMes);
			print("IdMes, A: " + IdMes);

			// Scope data
			var IdSc = (CAL_Measure(cal_chMeasureId) / cal_clcsu_RShunt * 1000000).toFixed(3);
			cal_IdSc.push(IdSc);
			print("Idtek, A: " + IdSc);

			// Relative error
			var IdErr = ((IdSet - IdSc) / IdSc * 100).toFixed(2);
			cal_IdErr.push(IdErr);
			print("IdSetErr, %: " + IdErr);

			var IdErrMes = ((IdMes - IdSc) / IdSc * 100).toFixed(2);
			cal_IdErrMes.push(IdErrMes);
			print("IdMesErr, %: " + IdErrMes);
			print("--------------------");


			
			if (anykey()) return 0;
		}
	}

	return 1;
}

function CAL_VerifyMesure()
{		
	CAL_ResetA();
	
	// Tektronix init
	CAL_TekInit();

	// Reload values
	var CurrentArray = CGEN_GetRange(cal_IdMin[cal_CurrentRange], cal_IdMax[cal_CurrentRange], cal_IdStp);

	if (CAL_CollectMesure(CurrentArray, cal_Iterations))
	{
		CAL_SaveId("LCSU_Id_fixed");

		// Plot relative error distribution
		scattern(cal_IdSc, cal_IdErrMes, "Current (in A)", "Error (in %)", "Current setpoint relative error");
	}
}
//--------------------
function CAL_CalibrateMesure()
{		
	CAL_ResetA();
	CAL_ResetIdCalMes()
	// Tektronix init
	CAL_TekInit();

	// Reload values
	var CurrentArray = CGEN_GetRange(cal_IdMin[cal_CurrentRange], cal_IdMax[cal_CurrentRange], cal_IdStp);

	if (CAL_CollectMesure(CurrentArray, cal_Iterations))
	{
		CAL_SaveId("LCSU_Id_fixed");

		// Plot relative error distribution
		scattern(cal_IdSc, cal_IdErr, "Current (in A)", "Error (in %)", "Current setpoint relative error");

		cal_IdCorr = CGEN_GetCorrection2("LCSU_Id_fixed");
		CAL_SetCoefIdMes(cal_IdCorr[0], cal_IdCorr[1], cal_IdCorr[2]);
		CAL_PrintCoefIdMes();
	}
}
//--------------------

function CAL_ResetIdCal()
{
	CAL_SetCoefId(0, 1, 0);
}
//--------------------
function CAL_SetCoefId(P2, P1, P0)
{
	switch(cal_CurrentRange)
	{	
		case 0:
		{
			dev.wf(20, P2);
			dev.wf(21, P1);
			dev.wf(22, P0);
		}
		break;
		
		case 1:
		{
			dev.wf(25, P2);
			dev.wf(26, P1);
			dev.wf(27, P0);
		}
		break;
	}		
}
//--------------------
function CAL_PrintCoefId()
{
	switch(cal_CurrentRange)
	{
		case 0:
		{
			print("Id 0 P2	: " + dev.rf(20));
			print("Id 0 P1	: " + dev.rf(21));
			print("Id 0 P0	: " + dev.rf(22));
		}
		break;
		
		case 1:
		{
			print("Id 1 P2	: " + dev.rf(25));
			print("Id 1 P1	: " + dev.rf(26));
			print("Id 1 P0	: " + dev.rf(27));
		}
		break
	}
}
//--------------------
function CAL_SetCoefIdMes(P2, P1, P0)
{
	switch(cal_CurrentRange)
	{	
		case 0:
		{
			dev.wf(34, P2);
			dev.wf(35, P1);
			dev.wf(36, P0);
		}
		break;
		
		case 1:
		{
			dev.wf(39, P2);
			dev.wf(40, P1);
			dev.wf(41, P0);
		}
		break;
	}		
}
//--------------------

function CAL_ResetIdCalMes()
{
	CAL_SetCoefIdMes(0, 1, 0);
}
//--------------------
function CAL_PrintCoefIdMes()
{
	switch(cal_CurrentRange)
	{
		case 0:
		{
			print("Id 0 P2	: " + dev.rf(34));
			print("Id 0 P1	: " + dev.rf(35));
			print("Id 0 P0	: " + dev.rf(36));
		}
		break;
		
		case 1:
		{
			print("Id 1 P2	: " + dev.rf(39));
			print("Id 1 P1	: " + dev.rf(40));
			print("Id 1 P0	: " + dev.rf(41));
		}
		break
	}
}