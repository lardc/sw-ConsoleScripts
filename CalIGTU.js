include("DMM6500.js")
include("CalGeneral.js")

//---------Calibration setup parameters-------

// Voltage source
//
cal_V_PulsePlate 	= 4000 				// us
cal_V_TriggerDelay	= 500e-6			// s
cal_V_Ilow 			= [0.1, 2, 20]		// mA
cal_V_Ihigh 		= [1, 20, 200]		// mA
cal_V_Rint 			= [8600, 34, 34]	// Ohm
cal_Vset_Low 		= 2;				// V
cal_Vset_High 		= 30;				// V
cal_Vmsr_Low 		= 2;				// V
cal_Vmsr_High 		= 10;				// V

// Current source
//
cal_I_PulsePlate 	= 250 				// us
cal_I_TriggerDelay	= 330e-6			// s
cal_I_Ilow			= 20				// mA
cal_I_Ihigh			= 500				// mA
cal_I_Vlow			= 0.5				// V
cal_I_Vhigh			= 20				// V

// Calibration types
//
cal_V_Imeas_R0		= 0
cal_V_Imeas_R1		= 1
cal_V_Imeas_R2		= 2
cal_V_Vmeas			= 3
cal_V_Vset			= 4
cal_I_Iset			= 5
cal_I_Vco			= 6
cal_I_Vneg			= 7
cal_I_Vmeas			= 8
	
cal_CalibrationType = cal_I_Iset

// Calibration points
//
cal_Points 			= 10
cal_Iterations 		= 5

// Load resistance
//
cal_Rload 			= 100				// Ohm
//------------------------------------------

// Counters
cal_CntTotal = 0;
cal_CntDone = 0;
//

// Variables
Setpoint = [];
Xmin = 0;
Xmax = 0;
Xstp = 0;

// Results storage
cal_I = [];
cal_V = [];

// Keithley data
cal_KEIData = [];
cal_Ikei = [];

// Relative error
cal_Err = [];
cal_SetErr = [];


function CAL_Calibrate_V()
{	
	CAL_V_Process(1)
}
//--------------------

function CAL_Verify_V()
{	
	CAL_V_Process(0)
}
//--------------------

function CAL_Calibrate_I()
{	
	CAL_I_Process(1)
}
//--------------------

function CAL_Verify_I()
{	
	CAL_I_Process(0)
}
//--------------------

function CAL_V_Process(Calibration)
{
		var SetpointArray
	
	// Reload values
	switch(cal_CalibrationType)
	{
		case cal_V_Vmeas:
			Xmin = cal_Vmsr_Low;
			Xmax = cal_Vmsr_High;
			break
			
		case cal_V_Vset:
			Xmin = cal_Vset_Low;
			Xmax = cal_Vset_High;
			break
		
		case cal_V_Imeas_R0:
		case cal_V_Imeas_R1:
		case cal_V_Imeas_R2:
			Xmin = cal_V_Ilow[cal_CalibrationType] / 1000 * cal_Rload + cal_V_Rint[cal_CalibrationType] * cal_V_Ilow[cal_CalibrationType] / 1000
			Xmax = cal_V_Ihigh[cal_CalibrationType] / 1000 * cal_Rload + cal_V_Rint[cal_CalibrationType] * cal_V_Ihigh[cal_CalibrationType] / 1000
			
			if(Xmin < cal_Vset_Low || Xmax > cal_Vset_High)
			{
				p("Wrong calibration parameters!")
				return
			}
			break
			
		default:
			p("Wrong calibration type!")
			return
	}
	
	Xstp = (Xmax - Xmin) / cal_Points;
	SetpointArray = CGEN_GetRange(Xmin, Xmax, Xstp)
	
	CAL_ConfigDMM6500()
	CAL_V_SetCurrentRange()
	CAL_V_ParametricMode(1)

	CAL_ResetArrays()
	CAL_ResetCalibration(Calibration)
	
	if (CAL_Collect(SetpointArray, cal_Iterations))
	{
		CAL_Save()
		CAL_PlotGraph()
		CAL_CalculateCorrection(Calibration)
	}
	
	CAL_V_ParametricMode(0)
}
//--------------------

function CAL_I_Process(Calibration)
{	
	var SetpointArray
	
	// Reload values
	switch(cal_CalibrationType)
	{
		case cal_I_Iset:
			Xmin = cal_I_Ilow
			Xmax = cal_I_Ihigh
			break
			
		case cal_I_Vmeas:
		case cal_I_Vco:
		case cal_I_Vneg:
			Xmin = cal_I_Vlow;
			Xmax = cal_I_Vhigh;
			break
			
		default:
			p("Wrong calibration type!")
			return
	}
	
	Xstp = (Xmax - Xmin) / cal_Points;
	SetpointArray = CGEN_GetRange(Xmin, Xmax, Xstp)
	
	CAL_ConfigDMM6500()

	CAL_ResetArrays()
	CAL_ResetCalibration(Calibration)
	
	if (CAL_Collect(SetpointArray, cal_Iterations))
	{
		CAL_Save()
		CAL_PlotGraph()
		CAL_CalculateCorrection(Calibration)
	}
}
//--------------------

function CAL_Collect(SetpointValues, IterationsCount)
{
	cal_CntTotal = IterationsCount * SetpointValues.length;
	cal_CntDone = 1;
	
	for (var i = 0; i < IterationsCount; i++)
	{
		for (var j = 0; j < SetpointValues.length; j++)
		{
			print("-- result " + cal_CntDone++ + " of " + cal_CntTotal + " --")
			//
			
			if(cal_CalibrationType != cal_I_Vmeas)
			{
				switch(cal_CalibrationType)
				{
					case cal_I_Vco:
					case cal_I_Vneg:
					case cal_V_Vmeas:
					case cal_V_Vset:
						KEI_SetVoltageRange(SetpointValues[j] * 1.2)
						break
						
					case cal_V_Imeas_R0:			
					case cal_V_Imeas_R1:			
					case cal_V_Imeas_R2:
						KEI_SetCurrentRange(SetpointValues[j] / cal_Rload * 1.2)
						break;
						
					case cal_I_Iset:
						KEI_SetCurrentRange(SetpointValues[j] / 1000 * 1.2)
						break
				}
				KEI_ActivateTrigger()
				sleep(500)
			}
			
			switch(cal_CalibrationType)
			{
				case cal_V_Vmeas:
				case cal_V_Vset:
					dev.wf(141, cal_V_Ihigh[cal_V_Imeas_R2])
					dev.wf(140, SetpointValues[j])
					dev.c(70)
					
					print("Vset,     V: " + SetpointValues[j])
					break;
					
				case cal_V_Imeas_R0:			
				case cal_V_Imeas_R1:			
				case cal_V_Imeas_R2:
					dev.wf(141, cal_V_Ihigh[cal_CalibrationType])
					dev.wf(140, SetpointValues[j])
					dev.c(70)
					
					print("Vset,     V: " + SetpointValues[j])
					break;
					
				case cal_I_Iset:
					dev.wf(140, 20)
					dev.wf(141, SetpointValues[j])
					dev.c(71)
					
					print("Iset,    mA: " + SetpointValues[j])
					break
					
				case cal_I_Vmeas:
				case cal_I_Vco:
				case cal_I_Vneg:
					dev.wf(140, SetpointValues[j])
					dev.wf(141, 100)
					dev.c(71)
					
					print("Vset,     V: " + SetpointValues[j])
					break
			}
			sleep(500)
			
			// Setpoint
			Setpoint.push(SetpointValues[j])
			
			switch(cal_CalibrationType)
			{
				case cal_V_Vmeas:
					var KEIData = KEI_ReadAverage()
					cal_KEIData.push(KEIData)
					print("KEI,     V: " + KEIData)
					
					var Uread = dev.rf(210)
					cal_V.push(Uread)
					print("Uread,   V: " + Uread)

					// Relative error
					var Uerr = ((Uread - KEIData) / KEIData * 100).toFixed(2)
					cal_Err.push(Uerr)
					print("Uerr,    %: " + Uerr)
					break
					
				case cal_I_Vco:
				case cal_I_Vneg:
				case cal_V_Vset:
					var KEIData = KEI_ReadAverage()
					
					if(KEIData < 0)
						KEIData = KEIData * (-1)
					cal_KEIData.push(KEIData)
					print("KEI,     V: " + KEIData)
				
					// Relative set error
					var VsetErr = ((KEIData - SetpointValues[j]) / SetpointValues[j] * 100).toFixed(2)
					cal_SetErr.push(VsetErr)
					print("VsetErr, %: " + VsetErr)
					break
					
				case cal_I_Iset:
				case cal_V_Imeas_R0:
				case cal_V_Imeas_R1:					
				case cal_V_Imeas_R2:
					var KEIData = KEI_ReadAverage() * 1000;
					cal_KEIData.push(KEIData)
					print("KEI,     mA: " + KEIData)
					
					var Iread = dev.rf(212)
					cal_I.push(Iread)
					print("Iread,   mA: " + Iread)

					// Relative error
					var Ierr = ((Iread - KEIData) / KEIData * 100).toFixed(2)
					cal_Err.push(Ierr)
					print("Ierr,     %: " + Ierr)
					
					if(cal_CalibrationType == cal_I_Iset)
					{
						var IsetErr = ((SetpointValues[j] - KEIData) / KEIData * 100).toFixed(2)
						cal_SetErr.push(IsetErr)
						print("IsetErr,  %: " + IsetErr)
					}
					break;
					
				case cal_I_Vmeas:					
					var Uco = dev.rf(210)
					cal_V.push(Uco)
					print("Uco,   V: " + Uco)
					
					Setpoint.push((-1) * SetpointValues[j])
					var Uneg = dev.rf(211)
					cal_V.push(Uneg)
					print("Uneg,  V: " + Uneg)

					// Relative error
					var Uerr = ((Uco - SetpointValues[j]) / SetpointValues[j] * 100).toFixed(2)
					cal_Err.push(Uerr)
					print("UcoErr,    %: " + Uerr)

					Uerr = ((Uneg - (-1) * SetpointValues[j]) / ((-1) * SetpointValues[j]) * 100).toFixed(2)
					cal_Err.push(Uerr)
					print("UnegErr,    %: " + Uerr)
					break
			}			

			print("--------------------")
			
			if(anykey())
				return 0;
		}
	}

	return 1;
}
//--------------------

function CAL_PlotGraph()
{	
	switch(cal_CalibrationType)
	{
		case cal_V_Vmeas:
			scattern(cal_KEIData, cal_Err, "Voltage (in V)", "Error (in %)", "Voltage relative error")
			break
			
		case cal_V_Vset:
		case cal_I_Vco:
		case cal_I_Vneg:
			scattern(Setpoint, cal_SetErr, "Voltage (in V)", "Error (in %)", "Set voltage relative error")
			break
			
		case cal_V_Imeas_R0:			
		case cal_V_Imeas_R1:			
		case cal_V_Imeas_R2:
			scattern(cal_KEIData, cal_Err, "Current (in mA)", "Error (in %)", "Current relative error")
			break;
			
		case cal_I_Iset:
			scattern(Setpoint, cal_SetErr, "Current (in mA)", "Error (in %)", "Set current relative error")
			scattern(cal_KEIData, cal_Err, "Current (in V)", "Error (in %)", "Current relative error")
			break
			
		case cal_I_Vmeas:
			scattern(Setpoint, cal_Err, "Voltage (in V)", "Error (in %)", "Voltage relative error")
			break
	}
}
//--------------------

function CAL_CalculateCorrection(Calibration)
{	
	Reg = []
	cal_Corr = []
	
	if(Calibration)
	{
		switch(cal_CalibrationType)
		{
			case cal_V_Vmeas:
				Reg = [0,1,2]			// [P2, P1, P0]
				cal_Corr = CGEN_GetCorrection2("IGTU_V")
				p('Voltage measurement coefficients:')
				break
				
			case cal_V_Vset:
				Reg = [20,21,22]		// [P2, P1, P0]
				cal_Corr = CGEN_GetCorrection2("IGTU_Vset")
				p('Voltage set coefficients:')
				break
				
			case cal_V_Imeas_R0:
				Reg = [5,6,7]			// [P2, P1, P0]
				cal_Corr = CGEN_GetCorrection2("IGTU_I")
				p('Current measurement coefficients, Range 0:')
				break
				
			case cal_V_Imeas_R1:
				Reg = [10,11,12]		// [P2, P1, P0]
				cal_Corr = CGEN_GetCorrection2("IGTU_I")
				p('Current measurement coefficients, Range 1:')
				break
				
			case cal_V_Imeas_R2:
				Reg = [15,16,17]		// [P2, P1, P0]
				cal_Corr = CGEN_GetCorrection2("IGTU_I")
				p('Current measurement coefficients, Range 2:')
				break
				
			case cal_I_Iset:				
				Reg = [25,26,27]		// [P2, P1, P0]
				cal_Corr = CGEN_GetCorrection2("IGTU_Iset")
				CAL_SetCoef(Reg, cal_Corr)
				p('Voltage set coefficients:')
				CAL_PrintCoef(Reg)
				p('')
				
				Reg = [46,47,48]		// [P2, P1, P0]
				cal_Corr = CGEN_GetCorrection2("IGTU_I")
				break
				
			case cal_I_Vco:
				Reg = [30,31,32]		// [P2, P1, P0]
				cal_Corr = CGEN_GetCorrection2("IGTU_Vset")
				break
				
			case cal_I_Vneg:
				Reg = [35,36,37]		// [P2, P1, P0]
				cal_Corr = CGEN_GetCorrection2("IGTU_Vset")
				break
				
			case cal_I_Vmeas:
				Reg = [40,41,42]		// [P2, P1, P0]
				cal_Corr = CGEN_GetCorrection2("IGTU_V")
				break
		}
		
		CAL_SetCoef(Reg, cal_Corr)
		CAL_PrintCoef(Reg)
	}
}
//--------------------

function CAL_ResetCalibration(Calibration)
{	
	Reg = []
	Data = [0,1,0]
	
	if(Calibration)
	{
		switch(cal_CalibrationType)
		{
			case cal_V_Vmeas:
				CAL_SetCoef([0,1,2], Data)	// [P2, P1, P0]		
				break
				
			case cal_V_Vset:
				CAL_SetCoef([20,21,22], Data)	// [P2, P1, P0]	
				break
				
			case cal_V_Imeas_R0:
				CAL_SetCoef([5,6,7], Data)	// [P2, P1, P0]	
				break
				
			case cal_V_Imeas_R1:
				CAL_SetCoef([10,11,12], Data)	// [P2, P1, P0]	
				break
				
			case cal_V_Imeas_R2:
				CAL_SetCoef([15,16,17], Data)	// [P2, P1, P0]	
				break
				
			case cal_I_Iset:
				CAL_SetCoef([25,26,27], Data)	// [P2, P1, P0]	
				CAL_SetCoef([46,47,48], Data)	// [P2, P1, P0]	
				break
				
			case cal_I_Vco:
				CAL_SetCoef([30,31,32], Data)	// [P2, P1, P0]	
				break
				
			case cal_I_Vneg:
				CAL_SetCoef([35,36,37], Data)	// [P2, P1, P0]	
				break
				
			case cal_I_Vmeas:
				CAL_SetCoef([40,41,42], Data)	// [P2, P1, P0]	
				break
		}
	}
}
//--------------------

function CAL_SetCoef(Reg, Data)
{
	dev.wf(Reg[0], Data[0])
	dev.wf(Reg[1], Data[1])
	dev.wf(Reg[2], Data[2])
}
//--------------------

function CAL_PrintCoef(Reg)
{
	print("P2 : " + dev.rf(Reg[0]))
	print("P1 : " + dev.rf(Reg[1]))
	print("P0 : " + dev.rf(Reg[2]))
}
//--------------------

function CAL_Save()
{		
	switch(cal_CalibrationType)
	{
		case cal_V_Vmeas:
			CGEN_SaveArrays("IGTU_V", cal_V, cal_KEIData, cal_Err)
			break
			
		case cal_V_Vset:
		case cal_I_Vco:
		case cal_I_Vneg:
			CGEN_SaveArrays("IGTU_Vset", cal_KEIData, Setpoint, cal_SetErr)
			break
			
		case cal_V_Imeas_R0:
		case cal_V_Imeas_R1:
		case cal_V_Imeas_R2:
			CGEN_SaveArrays("IGTU_I", cal_I, cal_KEIData, cal_Err)
			break
			
		case cal_I_Iset:
			CGEN_SaveArrays("IGTU_I", cal_I, cal_KEIData, cal_Err)
			CGEN_SaveArrays("IGTU_Iset", cal_KEIData, Setpoint, cal_SetErr)
			break
			
		case cal_I_Vmeas:
			CGEN_SaveArrays("IGTU_V", cal_V, Setpoint, cal_Err)
			break
	}
}
//--------------------

function CAL_V_SetCurrentRange()
{
	var CurrentMax;
	
	switch(cal_CalibrationType)
	{
		case cal_V_Imeas_R0:
		case cal_V_Imeas_R1:
		case cal_V_Imeas_R2:
			CurrentMax = Xmax / (cal_Rload + cal_V_Rint[cal_CalibrationType]) * 1000
			
		case cal_V_Vmeas:
		case cal_V_Vset:
			CurrentMax = cal_V_Ihigh[cal_V_Imeas_R2];
	}
	
	dev.wf(141, CurrentMax)
}
//--------------------

function CAL_V_ParametricMode(State)
{
	switch(cal_CalibrationType)
	{
		case cal_V_Vmeas:
			dev.w(55,State)
			
		default:
			dev.w(55,0)
	}
}
//--------------------

function CAL_ConfigDMM6500()
{
	KEI_Reset()
	
	switch(cal_CalibrationType)
	{
		case cal_I_Vco:
			KEI_ConfigVoltage(cal_I_PulsePlate)
			KEI_ConfigExtTrigger(cal_I_TriggerDelay)
			break
			
		case cal_I_Vneg:
			KEI_ConfigVoltage(cal_I_PulsePlate)
			KEI_ConfigExtTrigger(0)
			break
			
		case cal_I_Iset:
			KEI_ConfigCurrent(cal_I_PulsePlate)
			KEI_ConfigExtTrigger(cal_I_TriggerDelay)
			break
			
		case cal_V_Vmeas:
		case cal_V_Vset:
			KEI_ConfigVoltage(cal_V_PulsePlate)
			KEI_ConfigExtTrigger(cal_V_TriggerDelay)
			break
			
		case cal_V_Imeas_R0:
		case cal_V_Imeas_R1:
		case cal_V_Imeas_R2:
			KEI_ConfigCurrent(cal_V_PulsePlate)
			KEI_ConfigExtTrigger(cal_V_TriggerDelay)
			break;
	}
}
//--------------------

function CAL_ResetArrays()
{	
	// Setpoint storage
	Setpoint = []
	
	// Results storage
	cal_V = []
	cal_I = []

	// Keithley data
	cal_KEIData = []
	cal_Ikei = []

	// Relative error
	cal_Err = []
	cal_SetErr = []

	// Correction
	cal_Corr = []
	cal_Icorr = []
}
//--------------------